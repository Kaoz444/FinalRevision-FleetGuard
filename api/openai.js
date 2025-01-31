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
            "No funcional"
        ],
        issues: [
            "No presenta problemas",
            "Daño cosmético menor",
            "Daño estructural",
            "Problema funcional",
            "Grietas visibles en el espejo/vidrio",
            "Conexión floja",
            "Llanta Desinflada",
            "Falta de ajuste adecuado",
            "Acumulación de suciedad"
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
}
