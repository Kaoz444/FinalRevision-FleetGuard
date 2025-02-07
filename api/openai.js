export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, images } = req.body;

    // Validate input
    if (!prompt || !images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'Valid prompt and images are required' });
    }

    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        // Process each image
        const analysisPromises = images.map(async (imageBase64, index) => {
            try {
                // Ensure proper base64 format
                const base64Image = imageBase64.startsWith('data:image/') 
                    ? imageBase64 
                    : `data:image/jpeg;base64,${imageBase64}`;

                const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
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

                if (!openAIResponse.ok) {
                    const errorData = await openAIResponse.json();
                    throw new Error(`OpenAI API error: ${errorData.error?.message || openAIResponse.status}`);
                }

                const data = await openAIResponse.json();
                const content = data.choices[0].message.content.trim();
                
                // Parse JSON response from the content
                let parsedResponse;
                try {
                    parsedResponse = JSON.parse(content);
                } catch (parseError) {
                    console.error('Error parsing OpenAI response:', content);
                    throw new Error('Invalid JSON response from OpenAI');
                }

                return {
                    imageIndex: index + 1,
                    component: prompt,
                    status: parsedResponse.status,
                    issues: parsedResponse.issues,
                    details: parsedResponse.details
                };

            } catch (error) {
                console.error(`Error processing image ${index + 1}:`, error);
                return {
                    imageIndex: index + 1,
                    component: prompt,
                    status: 'Error',
                    issues: ['Error in analysis'],
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
/*export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt, images } = req.body;
    if (!prompt || !images || !Array.isArray(images)) {
        return res.status(400).json({ error: 'Se requieren prompt e imágenes válidas' });
    }

    const componentConditions = {
        tires: {
            statuses: ["Óptimo", "Desgaste normal", "Desgaste avanzado", "Desinflado", "Ponchado", "Crítico"],
            issues: ["Sin problemas", "Presión baja", "Desgaste irregular", "Desgaste en bordes", "Grietas", "Objeto punzante", "Deformación"]
        },
        mirrors: {
            statuses: ["Óptimo", "Funcional", "Dañado", "Crítico"],
            issues: ["Sin problemas", "Rayones menores", "Rajadura", "Desajustado", "Visibilidad reducida", "Roto"]
        },
        license_plates: {
            statuses: ["Óptimo", "Legible", "Parcialmente legible", "Ilegible"],
            issues: ["Sin problemas", "Suciedad", "Decoloración", "Dobladura", "Daño físico", "Baja reflectividad"]
        },
        headlights: {
            statuses: ["Óptimo", "Funcional", "Deteriorado", "No funcional"],
            issues: ["Sin problemas", "Opacidad", "Humedad", "Grietas", "Bajo brillo", "Daño estructural"]
        },
        cleanliness: {
            statuses: ["Excelente", "Aceptable", "Requiere limpieza", "Inaceptable"],
            issues: ["Sin problemas", "Polvo", "Manchas", "Suciedad excesiva", "Residuos"]
        },
        scratches: {
            statuses: ["Sin daños", "Daños menores", "Daños moderados", "Daños severos"],
            issues: ["Sin problemas", "Rayones superficiales", "Rayones profundos", "Abolladuras", "Pintura dañada"]
        }
    };

    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const componentType = prompt.toLowerCase().includes('llanta') ? 'tires' :
                            prompt.toLowerCase().includes('espejo') ? 'mirrors' :
                            prompt.toLowerCase().includes('placa') ? 'license_plates' :
                            prompt.toLowerCase().includes('faro') ? 'headlights' :
                            prompt.toLowerCase().includes('limpieza') ? 'cleanliness' :
                            prompt.toLowerCase().includes('rayon') ? 'scratches' : 'general';

        const conditions = componentConditions[componentType] || componentConditions.general;

        const analysisPromises = images.map(async (imageBase64, index) => {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: `Analiza la imagen de ${prompt} y responde en formato JSON:
                                {
                                    "component": "${prompt}",
                                    "status": "Uno de: ${conditions.statuses.join(', ')}",
                                    "issues": ["Problemas de: ${conditions.issues.join(', ')}"],
                                    "details": "Descripción breve"
                                }`
                            },
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: `Analiza esta imagen ${index + 1} de ${prompt}` },
                                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                                ]
                            }
                        ],
                        max_tokens: 300
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error en la respuesta de OpenAI: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices[0].message.content.trim();
                const parsedResponse = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);

                if (!conditions.statuses.includes(parsedResponse.status)) {
                    throw new Error('Estado no válido');
                }

                parsedResponse.issues = parsedResponse.issues.filter(issue => 
                    conditions.issues.includes(issue)
                );

                return parsedResponse;

            } catch (error) {
                console.error(`Error en imagen ${index + 1}:`, error);
                return {
                    component: prompt,
                    status: "Error",
                    issues: [`Error en análisis: ${error.message}`],
                    details: "Error procesando imagen"
                };
            }
        });

        const results = await Promise.all(analysisPromises);
        return res.status(200).json({ results });

    } catch (error) {
        console.error('Error general:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/
/*export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt, image } = req.body;
    if (!prompt || !image) {
        return res.status(400).json({ error: 'Se requiere un prompt y una imagen válida' });
    }

    // Estados y problemas predefinidos
    const predefinedConditions = {
        statuses: [
            "Condición óptima",
            "Leve desgaste",
            "Desgaste moderado",
            "Requiere reparación menor",
            "Requiere reparación urgente",
            "Llanta ponchada",
            "No funcional"
        ],
        issues: [
            "No presenta problemas",
            "Sin desgaste visible",
            "Condición normal",
            "Presión baja visible",
            "Desgaste irregular",
            "Daño estructural visible",
            "Pérdida total de presión",
            "Objeto punzante visible",
            "Deformación visible",
            "Grietas visibles",
            "Desgaste excesivo"
        ]
    };

    try {
        // Validate API key
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',  // Updated to the correct model name
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en inspección de vehículos. Siempre responde en formato JSON siguiendo esta estructura:
                        {
                            "component": "Nombre del componente analizado",
                            "status": "Uno de: ${predefinedConditions.statuses.join(', ')}",
                            "issues": ["Lista de problemas detectados de: ${predefinedConditions.issues.join(', ')}"]
                        }
                        
                        📌 **Reglas Importantes:**
                        - Si la llanta está visiblemente desinflada, usa "Llanta ponchada".
                        - Si hay deformaciones visibles, usa "Requiere reparación urgente".
                        - Si no hay daños, usa "Condición óptima".
                        - Si hay duda entre dos estados, elige el más severo.
                        - NO inventes información.
                        - Si la imagen es irreconocible, responde con:
                          {
                            "component": "Desconocido",
                            "status": "No determinado",
                            "issues": []
                          }`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analiza esta llanta utilizando exclusivamente estos estados y problemas:`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();

        // Validate OpenAI response
        if (!response.ok) {
            console.error('❌ Error en la respuesta de OpenAI:', JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.error?.message || 'Error en OpenAI' });
        }

        if (!data.choices?.[0]?.message?.content) {
            console.error('❌ Respuesta inválida de OpenAI:', JSON.stringify(data, null, 2));
            return res.status(500).json({ error: 'Formato incorrecto en la respuesta de OpenAI' });
        }

        // Parse and validate JSON response
        let parsedResponse;
        try {
            const content = data.choices[0].message.content.trim();
            // Remove markdown code block if present and parse JSON
            const jsonContent = content.replace(/```json\s*|\s*```/g, '').trim();
            
            parsedResponse = JSON.parse(jsonContent);
            
            console.log("✅ Respuesta JSON recibida de OpenAI:", JSON.stringify(parsedResponse, null, 2));
        } catch (error) {
            console.error("❌ Error al analizar JSON de OpenAI:", data.choices[0].message.content);
            console.error("Error details:", error.message);
            return res.status(500).json({ error: "Error al procesar la respuesta de IA" });
        }

        // Validate response structure
        if (!parsedResponse.component || !parsedResponse.status || !Array.isArray(parsedResponse.issues)) {
            console.error("❌ Respuesta mal formada de OpenAI:", parsedResponse);
            return res.status(500).json({ error: "Respuesta estructurada inválida de OpenAI" });
        }

        // Validate status is in predefined list
        if (!predefinedConditions.statuses.includes(parsedResponse.status)) {
            console.error("❌ Estado inválido recibido:", parsedResponse.status);
            return res.status(500).json({ error: "Estado fuera de los valores predefinidos" });
        }

        // Filter issues to only include predefined ones
        parsedResponse.issues = parsedResponse.issues.filter(issue => predefinedConditions.issues.includes(issue));

        // Send successful response
        console.log("✅ Respuesta procesada correctamente:", JSON.stringify(parsedResponse, null, 2));
        return res.status(200).json({ result: parsedResponse });

    } catch (error) {
        console.error('❌ Error en el procesamiento:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/
/*export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt, image } = req.body;
    if (!prompt || !image) {
        return res.status(400).json({ error: 'Se requiere un prompt y una imagen válida' });
    }

    // Estados y problemas predefinidos
    const predefinedConditions = {
        statuses: [
            "Condición óptima",
            "Leve desgaste",
            "Desgaste moderado",
            "Requiere reparación menor",
            "Requiere reparación urgente",
            "Llanta ponchada",
            "No funcional"
        ],
        issues: [
            "No presenta problemas",
            "Sin desgaste visible",
            "Condición normal",
            "Presión baja visible",
            "Desgaste irregular",
            "Daño estructural visible",
            "Pérdida total de presión",
            "Objeto punzante visible",
            "Deformación visible",
            "Grietas visibles",
            "Desgaste excesivo"
        ]
    };

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en inspección de vehículos. Siempre responde en formato JSON siguiendo esta estructura:
                        {
                            "component": "Nombre del componente analizado",
                            "status": "Uno de: ${predefinedConditions.statuses.join(', ')}",
                            "issues": ["Lista de problemas detectados de: ${predefinedConditions.issues.join(', ')}"]
                        }
                        
                        📌 **Reglas Importantes:**
                        - Si la llanta está visiblemente desinflada, usa "Llanta ponchada".
                        - Si hay deformaciones visibles, usa "Requiere reparación urgente".
                        - Si no hay daños, usa "Condición óptima".
                        - Si hay duda entre dos estados, elige el más severo.
                        - NO inventes información.
                        - Si la imagen es irreconocible, responde con:
                          {
                            "component": "Desconocido",
                            "status": "No determinado",
                            "issues": []
                          }`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analiza esta llanta utilizando exclusivamente estos estados y problemas:`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();

        // 🛠️ Verifica si OpenAI devolvió una respuesta válida
        if (!response.ok) {
            console.error('❌ Error en la respuesta de OpenAI:', JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: data.error || 'Error en OpenAI' });
        }

        if (!data.choices || !data.choices.length || !data.choices[0]?.message?.content) {
            console.error('❌ Respuesta inválida de OpenAI:', JSON.stringify(data, null, 2));
            return res.status(500).json({ error: 'Formato incorrecto en la respuesta de OpenAI' });
        }

        // ✅ OpenAI ya devuelve JSON estructurado, lo usamos directamente
             // ✅ Parse OpenAI response
            let parsedResponse;
            try {
                const content = data.choices[0].message.content.trim();
                // Check if content is already JSON
                if (content.startsWith('{') && content.endsWith('}')) {
                    try {
                        parsedResponse = JSON.parse(content);
                    } catch {
                        // If JSON parsing fails, try extracting JSON from code block
                        const jsonMatch = content.match(/```json\s*(\{[\s\S]*\})\s*```/);
                        if (jsonMatch) {
                            parsedResponse = JSON.parse(jsonMatch[1]);
                        } else {
                            throw new Error('Invalid JSON format');
                        }
                    }
                } else {
                    throw new Error('Response is not in JSON format');
                }
                console.log("✅ Respuesta JSON recibida de OpenAI:", JSON.stringify(parsedResponse, null, 2));
            } catch (error) {
                console.error("❌ Error al analizar JSON de OpenAI:", data.choices[0].message.content);
                console.error("Error details:", error.message);
                return res.status(500).json({ error: "Error al procesar la respuesta de IA" });
            }
        // ✅ Validar que los campos esperados existen en la respuesta
        if (!parsedResponse.component || !parsedResponse.status || !Array.isArray(parsedResponse.issues)) {
            console.error("❌ Respuesta mal formada de OpenAI:", parsedResponse);
            return res.status(500).json({ error: "Respuesta estructurada inválida de OpenAI" });
        }

        // ✅ Validar que el estado y los problemas están en las listas predefinidas
        if (!predefinedConditions.statuses.includes(parsedResponse.status)) {
            console.error("❌ Estado inválido recibido:", parsedResponse.status);
            return res.status(500).json({ error: "Estado fuera de los valores predefinidos" });
        }

        parsedResponse.issues = parsedResponse.issues.filter(issue => predefinedConditions.issues.includes(issue));

        // ✅ Enviar respuesta correcta al frontend
        console.log("✅ Respuesta procesada correctamente:", JSON.stringify(parsedResponse, null, 2));
        return res.status(200).json({ result: parsedResponse });

    } catch (error) {
        console.error('❌ Error en el procesamiento:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/


/*export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt } = req.body; // Eliminamos image porque no se usará
    if (!prompt) {
        return res.status(400).json({ error: 'Se requiere un prompt válido' });
    }

    // Lista de estados predefinidos y problemas estandarizados en español
    const predefinedConditions = {
        statuses: [
            "Condición óptima",
            "Leve desgaste",
            "Desgaste moderado",
            "Requiere reparación menor",
            "Requiere reparación urgente",
            "No funcional",
            "Llanta ponchada"
        ],
        issues: [
            "No presenta problemas",
            "Sin desgaste visible",
            "Condición normal",
            "Daño cosmético menor",
            "Daño estructural",
            "Problema funcional",
            "Conexión floja",
            "Falta de ajuste adecuado",
            "Acumulación de suciedad",
            "Pérdida total de presión",
            "Objeto punzante visible"
        ]
    };

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo',  // ✅ Ahora solo usamos GPT-4 Turbo
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto mecánico automotriz especializado en inspección visual de componentes.
                                Tu trabajo es analizar descripciones textuales de componentes vehiculares y detectar cualquier problema visible.

                                Directrices importantes:
                                1. NUNCA reportes "Condición óptima" si hay CUALQUIER señal de daño o desgaste.
                                2. Para llantas específicamente:
                                   - Si el componente es una llanta desinflada o visiblemente baja, SIEMPRE usa "Llanta ponchada" como estado.
                                   - Si hay pérdida visible de presión, incluye "Pérdida total de presión" en los problemas.
                                3. Examina cuidadosamente:
                                   - Deformaciones.
                                   - Daños visibles.
                                   - Desgaste irregular.
                                   - Problemas de presión.
                                4. Si hay duda entre dos estados, elige el más grave.
                                
                                Debes ser extremadamente minucioso y conservador en tu evaluación.`
                    },
                    {
                        role: 'user',
                        content: `Analiza este componente vehicular usando ÚNICAMENTE estos estados y problemas predefinidos:
                                  
                                  - Estados: ${predefinedConditions.statuses.join(', ')}.
                                  - Problemas: ${predefinedConditions.issues.join(', ')}.
                                  
                                  Componente a analizar: ${prompt}.
                                  
                                  Examina el estado del componente y reporta cualquier problema visible.`
                    }
                ],
                functions: [
                    {
                        name: "analyze_vehicle_component",
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado en JSON",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string", description: "El nombre del componente analizado" },
                                status: { 
                                    type: "string",
                                    description: "Estado del componente basado en la inspección",
                                    enum: predefinedConditions.statuses
                                },
                                issues: {
                                    type: "array",
                                    items: { 
                                        type: "string",
                                        description: "Lista de problemas detectados en el componente",
                                        enum: predefinedConditions.issues
                                    },
                                    minItems: 1
                                }
                            },
                            required: ["component", "status", "issues"]
                        }
                    }
                ],
                function_call: { name: "analyze_vehicle_component" },
                max_tokens: 150
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error en la respuesta de OpenAI:', data);
            return res.status(response.status).json({ error: data });
        }

        if (!data.choices || !data.choices.length || !data.choices[0]?.message?.function_call?.arguments) {
            console.error('Respuesta de OpenAI inválida:', data);
            return res.status(500).json({ error: 'Respuesta estructurada inválida de OpenAI' });
        }

        let parsedArguments;
        try {
            parsedArguments = JSON.parse(data.choices[0].message.function_call.arguments);
        } catch (error) {
            console.error('Error al analizar los argumentos JSON:', error);
            return res.status(500).json({ error: 'JSON inválido en function_call.arguments' });
        }

        // Validaciones de coherencia
        if (parsedArguments.status === "Condición óptima" && 
            parsedArguments.issues.some(issue => issue !== "No presenta problemas" && issue !== "Sin desgaste visible")) {
            console.error('Inconsistencia: Estado óptimo pero reporta problemas');
            return res.status(500).json({ error: 'Respuesta inconsistente: Estado óptimo con problemas reportados' });
        }

        return res.status(200).json({ result: parsedArguments });

    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/
