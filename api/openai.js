export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Se requiere un prompt válido' });
    }

    // Lista de estados y problemas predefinidos
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
                model: 'gpt-4o-mini',  // 🔹 CAMBIO DE MODELO
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto mecánico automotriz especializado en inspección visual de vehículos.
                                    Siempre responde con el siguiente formato JSON:
                                    {
                                        "component": "Nombre del componente analizado",
                                        "status": "Uno de: ${predefinedConditions.statuses.join(', ')}",
                                        "issues": ["Lista de problemas de: ${predefinedConditions.issues.join(', ')}"]
                                    }
                            
                                    📌 **Reglas importantes:**
                                    - NO inventes información.
                                    - Para llantas:
                                      - Si la llanta está visiblemente desinflada o dañada: usa "Llanta ponchada" como status
                                      - Si la llanta tiene presión normal y sin daños: usa "Condición óptima"
                                      - Si hay signos de desgaste pero presión normal: usa "Desgaste moderado"
                                    - Si no hay problemas visibles, usa: "Condición óptima" y ["No presenta problemas"].
                                    - Si tienes dudas, usa: "Condición indeterminada".
                                    - Siempre responde con JSON válido.`
                    },
                    {
                        role: 'user',
                        content: `Analiza el siguiente componente del vehículo:
                        Componente: ${prompt}`
                    }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();
        const rawResponse = data.choices[0]?.message?.content || '';

        // Extraer JSON manualmente con una expresión regular
        const regex = /"component":\s*"(.+?)",\s*"status":\s*"(.+?)",\s*"issues":\s*\[(.+?)\]/;
        const match = rawResponse.match(regex);

        if (!match) {
            return res.status(500).json({ error: 'Formato incorrecto en la respuesta de OpenAI' });
        }

        const parsedResponse = {
            component: match[1].trim(),
            status: match[2].trim(),
            issues: match[3].split(',').map(issue => issue.replace(/"/g, '').trim())
        };

        // Validar la respuesta antes de enviarla
        if (!predefinedConditions.statuses.includes(parsedResponse.status) || 
            !parsedResponse.issues.every(issue => predefinedConditions.issues.includes(issue))) {
            return res.status(500).json({ error: "Respuesta fuera de los valores predefinidos" });
        }

        return res.status(200).json({ result: parsedResponse });

    } catch (error) {
        return res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}

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
