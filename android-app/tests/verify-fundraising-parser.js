const fs = require('fs');

const java = fs.readFileSync('app/src/main/java/center/akyl/app/MainActivity.java', 'utf8');
function parseAmount(value) {
const page = `
<div class="main-page__need-item">
  <div class="main-page__need-heading">Уже собрали</div>
  <div class="main-page__need-subheading main-page__need-subheading-need">${value.replace(' ', '&nbsp;')}&nbsp;₽</div>
</div>`;

const normalizedPage = page.replaceAll('&nbsp;', ' ').replaceAll('&#8381;', '₽');
const match = normalizedPage.match(/main-page__need-heading[^>]*>\s*Уже собрали\s*<\/[^>]+>.*?main-page__need-subheading[^>]*>\s*([0-9][0-9\s\u00a0.,]{0,20})\s*₽/isu);
return Number((match?.[1] || '').replace(/\s/g, ''));
}

if (parseAmount('44 760') !== 44760) throw new Error('Не разобрана старая сумма');
if (parseAmount('45 145') !== 45145) throw new Error('Не разобрана новая сумма');
if (java.includes('collected = "44760"')) throw new Error('В приложении осталась фиксированная сумма');
console.log('ПРОВЕРКА ПРОЙДЕНА: сумма обновляется с 44 760 ₽ до 45 145 ₽');
