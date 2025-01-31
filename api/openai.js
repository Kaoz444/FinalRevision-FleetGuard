export default async function handler(req, res) {
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
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto mecánico automotriz especializado en inspección visual de componentes.
                                Tu trabajo es analizar imágenes de componentes vehiculares y detectar cualquier problema visible.

                                Directrices importantes:
                                1. NUNCA reportes "Condición óptima" si hay CUALQUIER señal de daño o desgaste.
                                2. Para llantas específicamente:
                                   - Si ves una llanta desinflada o visiblemente baja, SIEMPRE usa "Llanta ponchada" como estado.
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
                        content: [
                            {
                                type: 'text',
                                text: `Analiza este componente vehicular usando ÚNICAMENTE estos estados y problemas predefinidos:
                                      
                                      Estados: ${predefinedConditions.statuses.join(', ')}.
                                      Problemas: ${predefinedConditions.issues.join(', ')}.
                                      
                                      Componente a analizar: ${prompt}.
                                      
                                      Examina la imagen con mucho detalle y reporta cualquier problema visible.`
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
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado en JSON",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string", description: "El nombre del componente" },
                                status: { 
                                    type: "string",
                                    description: "El estado del componente. IMPORTANTE: Si ves cualquier daño o desgaste, NO uses 'Condición óptima'",
                                    enum: predefinedConditions.statuses
                                },
                                issues: {
                                    type: "array",
                                    items: { 
                                        type: "string",
                                        description: "Lista de problemas detectados. Si hay cualquier problema visible, NO uses 'No presenta problemas'",
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

        if (response.ok && data.choices.length > 0) {
            const choice = data.choices[0];
            if (!choice?.message?.function_call?.arguments) {
                console.error('function_call.arguments no está presente o es inválido:', data);
                return res.status(500).json({ error: 'Respuesta estructurada inválida de OpenAI' });
            }

            let parsedArguments;
            try {
                parsedArguments = JSON.parse(choice.message.function_call.arguments);
            } catch (error) {
                console.error('Error al analizar los argumentos JSON:', error);
                return res.status(500).json({ error: 'JSON inválido en function_call.arguments' });
            }

            // Validaciones adicionales de coherencia
            if (parsedArguments.status === "Condición óptima" && 
                parsedArguments.issues.some(issue => issue !== "No presenta problemas" && issue !== "Sin desgaste visible")) {
                console.error('Inconsistencia: Estado óptimo pero reporta problemas');
                return res.status(500).json({ error: 'Respuesta inconsistente: Estado óptimo con problemas reportados' });
            }

            return res.status(200).json({
                result: parsedArguments
            });
        } else {
            console.error('Error en la respuesta de OpenAI:', data);
            return res.status(response.status).json({ error: data });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}

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
                model: 'gpt-4-turbo',  // Changed to vision model
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto mecánico automotriz especializado en inspección visual de componentes.
                                Tu trabajo es analizar imágenes de componentes vehiculares y detectar cualquier problema visible.

                                Directrices importantes:
                                1. NUNCA reportes "Condición óptima" si hay CUALQUIER señal de daño o desgaste
                                2. Para llantas específicamente:
                                   - Si ves una llanta desinflada o visiblemente baja, SIEMPRE usa "Llanta ponchada" como estado
                                   - Si hay pérdida visible de presión, incluye "Pérdida total de presión" en los problemas
                                3. Examina cuidadosamente:
                                   - Deformaciones
                                   - Daños visibles
                                   - Desgaste irregular
                                   - Problemas de presión
                                4. Si hay duda entre dos estados, elige el más grave
                                
                                Debes ser extremadamente minucioso y conservador en tu evaluación.`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analiza este componente vehicular usando ÚNICAMENTE estos estados y problemas predefinidos:
                                      
                                      Estados: ${predefinedConditions.statuses.join(', ')}.
                                      Problemas: ${predefinedConditions.issues.join(', ')}.
                                      
                                      Componente a analizar: ${prompt}.
                                      
                                      Examina la imagen con mucho detalle y reporta cualquier problema visible.`
                            },
                            {
                                type: 'image_url',
                                image_url: image
                            }
                        ]
                    }
                ],
                functions: [
                    {
                        name: "analyze_vehicle_component",
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado en JSON",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string", description: "El nombre del componente" },
                                status: { 
                                    type: "string",
                                    description: "El estado del componente. IMPORTANTE: Si ves cualquier daño o desgaste, NO uses 'Condición óptima'",
                                    enum: predefinedConditions.statuses
                                },
                                issues: {
                                    type: "array",
                                    items: { 
                                        type: "string",
                                        description: "Lista de problemas detectados. Si hay cualquier problema visible, NO uses 'No presenta problemas'",
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

        if (response.ok && data.choices.length > 0) {
            const choice = data.choices[0];
            if (!choice?.message?.function_call?.arguments) {
                console.error('function_call.arguments no está presente o es inválido:', data);
                return res.status(500).json({ error: 'Respuesta estructurada inválida de OpenAI' });
            }

            let parsedArguments;
            try {
                parsedArguments = JSON.parse(choice.message.function_call.arguments);
            } catch (error) {
                console.error('Error al analizar los argumentos JSON:', error);
                return res.status(500).json({ error: 'JSON inválido en function_call.arguments' });
            }

            // Validaciones adicionales de coherencia
            if (parsedArguments.status === "Condición óptima" && 
                parsedArguments.issues.some(issue => issue !== "No presenta problemas" && issue !== "Sin desgaste visible")) {
                console.error('Inconsistencia: Estado óptimo pero reporta problemas');
                return res.status(500).json({ error: 'Respuesta inconsistente: Estado óptimo con problemas reportados' });
            }

            // Para llantas específicamente
            if (prompt.toLowerCase().includes('llanta') && 
                image.toLowerCase().includes('flat') && 
                parsedArguments.status !== "Llanta ponchada") {
                console.error('Error: Llanta visiblemente ponchada no identificada');
                return res.status(500).json({ error: 'Análisis incorrecto: Llanta ponchada no identificada' });
            }

            return res.status(200).json({
                result: parsedArguments
            });
        } else {
            console.error('Error en la respuesta de OpenAI:', data);
            return res.status(response.status).json({ error: data });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/
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
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `Eres una IA que analiza componentes de vehículos basándote en condiciones predefinidas.
                                  Si el componente está en buen estado y funcionando correctamente, DEBES usar "Condición óptima" 
                                  como estado y "No presenta problemas" o "Sin desgaste visible" como problemas.
                                  Solo usa estados negativos cuando haya evidencia clara de problemas.
                                  Siempre devuelve tu análisis utilizando uno de los estados y problemas predefinidos.`
                    },
                    {
                        role: 'user',
                        content: `Analiza el siguiente componente del vehículo basado en estas condiciones predefinidas:
                                  
                                  Estados: ${predefinedConditions.statuses.join(', ')}.
                                  Problemas: ${predefinedConditions.issues.join(', ')}.
                                  
                                  Importante: Si el componente está en buen estado visual y funcional,
                                  debes usar "Condición óptima" como estado y "No presenta problemas" 
                                  o "Sin desgaste visible" como problemas.
                                  
                                  Componente: ${prompt}.`
                    }
                ],
                functions: [
                    {
                        name: "analyze_vehicle_component",
                        description: "Analiza un componente de vehículo y devuelve un resultado estructurado en JSON. Si el componente está en buen estado, usa 'Condición óptima' y 'No presenta problemas'.",
                        parameters: {
                            type: "object",
                            properties: {
                                component: { type: "string", description: "El nombre del componente" },
                                status: { 
                                    type: "string", 
                                    description: "El estado del componente. Usar 'Condición óptima' si está en buen estado", 
                                    enum: predefinedConditions.statuses,
                                    default: "Condición óptima"
                                },
                                issues: {
                                    type: "array",
                                    items: { 
                                        type: "string", 
                                        description: "Lista de problemas detectados. Usar 'No presenta problemas' si está en buen estado", 
                                        enum: predefinedConditions.issues 
                                    },
                                    default: ["No presenta problemas"]
                                }
                            },
                            required: ["component", "status", "issues"]
                        }
                    }
                ],
                function_call: { name: "analyze_vehicle_component" },
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

            return res.status(200).json({
                result: parsedArguments
            });
        } else {
            console.error('Error en la respuesta de OpenAI:', data);
            return res.status(response.status).json({ error: data });
        }
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}*/

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
