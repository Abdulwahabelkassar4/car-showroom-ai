require('dotenv').config();
const { OpenAI } = require('openai');
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Allowed filters with database mapping
const allowedFilters = {
  make: { type: 'string', column: 'c.make' },
  model: { type: 'string', column: 'c.model' },
  body_style: { 
    type: 'string', 
    column: 'c.body_style',
    synonyms: { 'suv': ['sport utility', 'off-roader'], 'sedan': ['saloon'] }
  },
  min_price: { type: 'number', column: 'c.price', operator: '>=' },
  max_price: { type: 'number', column: 'c.price', operator: '<=' },
  color: { type: 'string', column: 'c.color' },
  min_year: { type: 'number', column: 'c.year', operator: '>=' },
  max_mileage: { type: 'number', column: 'c.odometer', operator: '<=' },
  transmission: { 
    type: 'string', 
    column: 'c.transmission',
    allowed: ['automatic', 'manual']
  }
};

// OpenAI function definition
const tools = [{
  type: "function",
  function: {
    name: "search_cars",
    description: "Search luxury car inventory",
    parameters: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(allowedFilters).map(([key, config]) => [
          key, 
          { 
            type: config.type, 
            description: `Filter by ${key.replace('c.', '')}`,
            ...(config.allowed ? { enum: config.allowed } : {})
          }
        ])
      )
    }
  }
}];

// Build safe SQL query with sales status
function buildQuery(filters) {
  const whereClauses = [];
  const params = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (!allowedFilters[key]) return;

    const config = allowedFilters[key];
    let sanitizedValue = value;

    // Handle synonyms
    if (config.synonyms) {
      for (const [canonical, aliases] of Object.entries(config.synonyms)) {
        if (aliases.includes(value.toLowerCase())) {
          sanitizedValue = canonical;
          break;
        }
      }
    }

    whereClauses.push(`${config.column} ${config.operator || '='} ?`);
    params.push(sanitizedValue);
  });

  return {
    sql: `SELECT 
            c.id,
            c.make,
            c.model,
            c.year,
            c.price,
            c.color,
            c.transmission,
            c.image,
            IFNULL(MAX(s.sold), 0) AS sold
          FROM cars_data.cars c
          LEFT JOIN cars_data.sales s ON c.id = s.car_id
          ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
          GROUP BY c.id
          ORDER BY c.created_at DESC
          LIMIT 5`,
    params
  };
}

// Main assistant endpoint
router.post('/assistant', async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Step 1: Get AI interpretation
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
      tools,
      tool_choice: "auto",
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    let carResults = [];

    // Step 2: Query database if filters are provided
    if (toolCall?.function.name === "search_cars") {
      const filters = JSON.parse(toolCall.function.arguments);
      const { sql, params } = buildQuery(filters);
      [carResults] = await pool.query(sql, params);
    }

    // Step 3: Generate AI response
    const messages = [
      {
        role: "system",
        content: `You are Luxury Wheels' concierge. Respond helpfully about cars.
                  ${carResults.length ? 'Matching cars:\n' + carResults.map(c => 
                    `${c.make} ${c.model} (${c.year}) - $${c.price}${c.sold ? ' (SOLD)' : ''}`
                  ).join('\n') : ''}`
      },
      { role: "user", content: userMessage }
    ];

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    // Prepare response
    res.json({
      reply: gptResponse.choices[0].message.content,
      cars: carResults.map(car => ({
        id:    car.id,            // ← make sure id is included
        make: car.make,
        model: car.model,
        year: car.year,
        price: car.price,
        image: car.image,
        sold: car.sold === 1  // Convert to boolean
      }))
    });

  } catch (err) {
    console.error("Assistant error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

module.exports = router;