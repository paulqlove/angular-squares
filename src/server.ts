import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import bootstrap from './bootstrap.server';

const app = express();
const port = process.env['PORT'] || 4000;
const __dirname = dirname(fileURLToPath(import.meta.url));
const distFolder = resolve(__dirname, '../browser');

app.set('view engine', 'html');
app.set('views', distFolder);

app.get('*.*', express.static(distFolder, {
  maxAge: '1y'
}));

app.get('*', (req, res) => {
  const engine = new CommonEngine();
  
  engine
    .render({
      bootstrap,
      documentFilePath: join(distFolder, 'index.html'),
      url: req.url,
      providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }]
    })
    .then(html => res.send(html))
    .catch(err => {
      console.error(err);
      res.status(500).send('Server error');
    });
});

app.listen(port, () => {
  console.log(`Node Express server listening on http://localhost:${port}`);
});
