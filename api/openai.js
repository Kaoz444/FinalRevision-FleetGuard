export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, images } = req.body;

    if (!prompt || !images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Valid prompt and images are required' });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    try {
        const analysisPromises = images.map(async (imageBase64, index) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

            try {
                const base64Image = imageBase64.startsWith('data:image/')
                    ? imageBase64
                    : `data:image/jpeg;base64,${imageBase64}`;

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: `Eres un inspector técnico de vehículos profesional.
                                SIEMPRE proporciona tus análisis en este formato JSON específico:
                                {
                                    "status": "Uno de: Óptimo, Desgaste normal, Desgaste avanzado, Desinflado, Ponchado, Crítico",
                                    "issues": ["Lista específica de problemas detectados"],
                                    "details": "Descripción técnica detallada del estado"
                                }        
                                Reglas críticas:
                                - NO incluyas el campo "component"
                                - Si ves cualquier desgaste, NUNCA uses "Óptimo"
                                - Si hay deformaciones, usa "Crítico"
                                - Si hay duda entre dos estados, elige el más severo
                                - Los "issues" deben ser específicos y concretos
                                - El campo "details" debe ser una descripción técnica detallada
                                NO incluyas recomendaciones ni comentarios adicionales.`
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Analiza este componente: ${prompt}`
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: base64Image
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 500,
                        temperature: 0.7
                    })
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
                }

                const data = await response.json();
                let content = data.choices[0].message.content.trim();

                // Eliminar etiquetas de bloque de código si están presentes
                content = content.replace(/```json\s*|\s*```/g, '');

                // Intentar parsear la respuesta a JSON
                let parsedResponse;
                try {
                    parsedResponse = JSON.parse(content);
                } catch (parseError) {
                    console.error('Error parsing OpenAI response:', content);
                    throw new Error('Error parsing JSON response');
                }

                // Validar la estructura de la respuesta
                if (!parsedResponse.status || !Array.isArray(parsedResponse.issues) || !parsedResponse.details) {
                    throw new Error('Invalid response structure from OpenAI');
                }

                return {
                    imageIndex: index + 1,
                    status: parsedResponse.status,
                    issues: parsedResponse.issues,
                    details: parsedResponse.details
                };

            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    console.error(`Timeout en la imagen ${index + 1}`);
                    return {
                        imageIndex: index + 1,
                        status: 'Error',
                        issues: ['Tiempo de espera excedido'],
                        details: 'La petición tardó demasiado y fue cancelada'
                    };
                }
                console.error(`Error procesando imagen ${index + 1}:`, error);
                return {
                    imageIndex: index + 1,
                    status: 'Error',
                    issues: ['Error en análisis'],
                    details: error.message
                };
            }
        });

        const results = await Promise.all(analysisPromises);
        return res.status(200).json({ results });

    } catch (error) {
        console.error('General error:', error);
        return res.status(500).json({ 
            error: 'Error processing request',
            details: error.message
        });
    }
}
