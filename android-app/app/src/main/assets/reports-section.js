(function(){
  "use strict";
  var names=["Ихсан Талгатович","Салих Талгатович","Рустам Ильфатович","Исмаил Ринатович","Хаким Алиевич","Нурислам Алиевич","Исмагыйль Алиевич","Ибрахим Ильшатович","Исмагыйл Ильшатович","Сулейман Ильшатович","Мухаммад Ильшатович","Хасан Динарович","Мухаммад Динарович","Шамсимухаммад Линарович","Мухаммад Эльдарович","АбдульКарим Ринатович","Мухаммад Рашидович","Ибрахим Рашидович","Ахмад Айратович","Абдуррауф Саидович","Алан Тимурович","Мустафа Рушанович","Ахмад Рушанович","Умар Аббасович","АбдуЛла Аббасович","Идрис Ильдарович","Ильяс Ильдарович","Аяз Алмазович","Риназ Алмазович","Ильяс Алмазович"];
  var entry=document.getElementById("reportsEntry"),sheet=document.getElementById("reportsSheet"),body=document.getElementById("reportBody"),role=document.getElementById("role");
  if(!entry||!sheet||!body||!role)return;
  function esc(x){return String(x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function access(){entry.classList.toggle("hidden",!/^(Директор|Администратор|Заместитель)/.test(role.textContent.trim()))}
  function render(period){
    if(period==="year")body.innerHTML='<article class="report-card"><h3>Годовой отчёт 2025–2026</h3><p>Отчёт о деятельности примечетских курсов при мечети «Зангар».</p><div class="report-metrics"><div class="report-metric"><strong>50</strong>учеников за год</div><div class="report-metric"><strong>1186</strong>страниц хифза</div><div class="report-metric"><strong>770 ч 20 мин</strong>дополнительных уроков</div><div class="report-metric"><strong>15</strong>научились читать</div></div><h3>Первые 30 учеников — имя и отчество</h3><ol class="student-names">'+names.map(function(n){return '<li>'+esc(n)+'</li>'}).join('')+'</ol><button class="btn report-print" onclick="window.print()">Печать / сохранить PDF</button></article>';
    else {var label={week:"Недельный",month:"Месячный",semester:"Семестровый"}[period];body.innerHTML='<article class="report-card"><h3>'+label+' отчёт</h3><p>Здесь будет автоматически собираться успеваемость, посещаемость, болезни, сдача уроков и прогресс по Куръану за выбранный период.</p><div class="empty">Отчёт появится после записей учителей в журнале</div><button class="btn report-print" onclick="window.print()">Печать / сохранить PDF</button></article>'}
  }
  entry.onclick=function(){sheet.classList.remove("hidden");render("year")};document.getElementById("reportsClose").onclick=function(){sheet.classList.add("hidden")};
  document.getElementById("reportTabs").onclick=function(e){var b=e.target.closest("button[data-period]");if(!b)return;document.querySelectorAll("#reportTabs button").forEach(function(x){x.classList.toggle("active",x===b)});render(b.dataset.period)};
  new MutationObserver(access).observe(role,{childList:true,characterData:true,subtree:true});access();render("year");
})();
