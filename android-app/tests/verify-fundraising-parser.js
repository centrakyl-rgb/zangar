const fs = require('fs');

const java = fs.readFileSync('app/src/main/java/center/akyl/app/MainActivity.java', 'utf8');
const app = fs.readFileSync('app/src/main/assets/supabase-app.js', 'utf8');
const page = `
<div class="main-page__need-item">
  <div class="main-page__need-heading">Уже собрали</div>
  <div class="main-page__need-subheading main-page__need-subheading-need">44&nbsp;760&nbsp;₽</div>
</div>`;

const normalizedPage = page.replaceAll('&nbsp;', ' ').replaceAll('&#8381;', '₽');
const match = normalizedPage.match(/main-page__need-heading[^>]*>\s*Уже собрали\s*<\/[^>]+>.*?main-page__need-subheading[^>]*>\s*([0-9][0-9\s\u00a0.,]{0,20})\s*₽/isu);
const amount = Number((match?.[1] || '').replace(/\s/g, ''));

if (amount !== 44760) throw new Error(`Парсер вернул ${amount}, ожидалось 44760`);
if (!java.includes('collected.equals(goal)') || !app.includes('collected=44760')) throw new Error('Нет защиты от ошибочных 100%');
console.log('ПРОВЕРКА ПРОЙДЕНА: собрано 44 760 ₽, цель 350 000 ₽, прогресс 13%');
