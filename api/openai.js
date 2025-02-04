export default async function handler(req, res) {
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
}
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
