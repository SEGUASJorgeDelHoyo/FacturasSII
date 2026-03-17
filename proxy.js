const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const app = express();

const ODooUrl = 'https://rapsodoo-odoo-sh-seguas.odoo.com/jsonrpc';

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.post('/odoo-jsonrpc', async (req, res) => {
  try {
    const response = await fetch(ODooUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.text();
    res.status(response.status).type('application/json').send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy de Odoo escuchando en http://localhost:${port}`));
