/*export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt, image } = req.body;

    if (!prompt || !image) {
        return res.status(400).json({ error: 'Se requieren el prompt y la imagen' });
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
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `Eres una IA que analiza componentes de vehículos basándote en condiciones predefinidas. 
                                  Siempre devuelve tu análisis utilizando uno de los estados y problemas predefinidos.`
                    },
                    {
                        role: 'user',
                        content: `Analiza el siguiente componente del vehículo basado en estas condiciones predefinidas:
                                  
                                  Estados: ${predefinedConditions.statuses.join(', ')}.
                                  Problemas: ${predefinedConditions.issues.join(', ')}.
                                  
                                  Componente: ${prompt}.`
                    }
                ],
                functions: [
                    {
                        name: "analyze_vehicle_component",
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado en JSON.",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string", description: "El nombre del componente" },
                                status: { type: "string", description: "El estado del componente", enum: predefinedConditions.statuses },
                                issues: {
                                    type: "array",
                                    items: { type: "string", description: "Lista de problemas detectados", enum: predefinedConditions.issues }
                                }
                            },
                            required: ["component", "status", "issues"] // Asegurar que 'issues' sea requerido
                        }
                    }
                ],
                max_tokens: 100
            })
        });

        const data = await response.json();

        if (response.ok && data.choices.length > 0) {
            const choice = data.choices[0];
            if (!choice?.message?.function_call?.arguments) {
                console.error('function_call.arguments no está presente o es inválido:', data);
                return res.status(500).json({ error: 'Respuesta estructurada inválida de OpenAI' });
            }

            let parsedArguments;
            try {
                parsedArguments = JSON.parse(choice.message.function_call.arguments);
                // Fallback para issues si no están presentes
                parsedArguments.issues = Array.isArray(parsedArguments.issues) 
                    ? parsedArguments.issues 
                    : ["No presenta problemas"];
            } catch (error) {
                console.error('Error al analizar los argumentos JSON:', error);
                return res.status(500).json({ error: 'JSON inválido en function_call.arguments' });
            }

            // Validar que el status y los issues estén dentro de las condiciones predefinidas
            if (!predefinedConditions.statuses.includes(parsedArguments.status)) {
                console.error('Estado inválido recibido:', parsedArguments.status);
                return res.status(500).json({ error: 'Estado inválido en la respuesta' });
            }

            if (!Array.isArray(parsedArguments.issues) || parsedArguments.issues.some(issue => !predefinedConditions.issues.includes(issue))) {
                console.error('Problemas inválidos recibidos:', parsedArguments.issues);
                return res.status(500).json({ error: 'Problemas inválidos en la respuesta' });
            }

            res.status(200).json({
                result: parsedArguments
            });
        } else {
            console.error('Error en la respuesta de OpenAI:', data);
            res.status(response.status).json({ error: data });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/
// In openai.js, replace the existing handler with this updated version:
/*export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt, image } = req.body;

    if (!prompt || !image) {
        return res.status(400).json({ error: 'Se requieren el prompt y la imagen' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-vision-preview',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un inspector automotriz experto que analiza imágenes de componentes de vehículos. 
                                 Debes analizar el estado del componente usando solo los estados y problemas predefinidos.`
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: `Analiza este componente: ${prompt}` },
                            { type: 'image_url', url: `data:image/jpeg;base64,${image}` }
                        ]
                    }
                ],
                functions: [
                    {
                        name: "analyze_vehicle_component",
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string" },
                                status: { 
                                    type: "string",
                                    enum: [
                                        "Condición óptima",
                                        "Leve desgaste",
                                        "Desgaste moderado",
                                        "Requiere reparación menor",
                                        "Requiere reparación urgente",
                                        "No funcional",
                                        "Llanta ponchada"
                                    ]
                                },
                                issues: {
                                    type: "array",
                                    items: {
                                        type: "string",
                                        enum: [
                                            "No presenta problemas",
                                            "Daño cosmético menor",
                                            "Daño estructural",
                                            "Problema funcional",
                                            "Conexión floja",
                                            "Falta de ajuste adecuado",
                                            "Acumulación de suciedad",
                                            "Pérdida total de presión",
                                            "Objeto punzante visible"
                                        ]
                                    }
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

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]?.message?.function_call) {
            throw new Error('Respuesta inválida de OpenAI');
        }

        try {
            const result = JSON.parse(data.choices[0].message.function_call.arguments);
            
            // Validate the response structure
            if (!result.component || !result.status || !Array.isArray(result.issues)) {
                throw new Error('Estructura de respuesta inválida');
            }

            return res.status(200).json({ result });
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            throw new Error('Error al procesar la respuesta de OpenAI');
        }

    } catch (error) {
        console.error('Error in OpenAI handler:', error);
        return res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}*/
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt, image } = req.body;

    if (!prompt || !image) {
        return res.status(400).json({ error: 'Se requieren el prompt y la imagen' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-vision-preview', // Modelo actualizado
                messages: [
                    {
                        role: 'system',
                        content: `Eres una IA que analiza componentes de vehículos basándote en condiciones predefinidas. 
                                  Siempre devuelve tu análisis utilizando uno de los estados y problemas predefinidos.`
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
                                url: `data:image/jpeg;base64,${image}`
                            }
                        ]
                    }
                ],
                functions: [
                    {
                        name: "analyze_vehicle_component",
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string" },
                                status: { 
                                    type: "string",
                                    enum: [
                                        "Condición óptima",
                                        "Leve desgaste",
                                        "Desgaste moderado",
                                        "Requiere reparación menor",
                                        "Requiere reparación urgente",
                                        "No funcional",
                                        "Llanta ponchada"
                                    ]
                                },
                                issues: {
                                    type: "array",
                                    items: {
                                        type: "string",
                                        enum: [
                                            "No presenta problemas",
                                            "Daño cosmético menor",
                                            "Daño estructural",
                                            "Problema funcional",
                                            "Conexión floja",
                                            "Falta de ajuste adecuado",
                                            "Acumulación de suciedad",
                                            "Pérdida total de presión",
                                            "Objeto punzante visible"
                                        ]
                                    }
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error: ${response.status}, Details: ${errorText}`);
            throw new Error(`HTTP error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0]?.message?.function_call) {
            throw new Error('Respuesta inválida de OpenAI');
        }

        try {
            const result = JSON.parse(data.choices[0].message.function_call.arguments);
            
            // Validar la estructura de la respuesta
            if (!result.component || !result.status || !Array.isArray(result.issues)) {
                throw new Error('Estructura de respuesta inválida');
            }

            return res.status(200).json({ result });
        } catch (parseError) {
            console.error('Error parsing OpenAI response:', parseError);
            throw new Error('Error al procesar la respuesta de OpenAI');
        }

    } catch (error) {
        console.error('Error in OpenAI handler:', error);
        return res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

