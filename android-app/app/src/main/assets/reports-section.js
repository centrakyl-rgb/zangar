(function(){
  "use strict";
  var entry=document.getElementById("reportsEntry"),sheet=document.getElementById("reportsSheet"),body=document.getElementById("reportBody"),role=document.getElementById("role");
  if(!entry||!sheet||!body||!role)return;
  function access(){var active=document.querySelector('.nav-button.active'),inJournal=active&&active.dataset.nav==="journal",allowed=/^(Директор|Администратор|Заместитель)/.test(role.textContent.trim());entry.classList.toggle("hidden",!(allowed&&inJournal))}
  function render(period){
    var label={week:"Недельный",month:"Месячный",semester:"Семестровый",year:"Годовой"}[period];body.innerHTML='<article class="report-card"><h3>'+label+' отчёт</h3><p>Успеваемость, посещаемость, болезни, сдача уроков и прогресс по Куръану формируются из защищённого журнала.</p><div class="empty">Отчёт появится после записей учителей в журнале</div><button class="btn report-print" onclick="window.print()">Печать / сохранить PDF</button></article>'
  }
  entry.onclick=function(){sheet.classList.remove("hidden");render("year")};document.getElementById("reportsClose").onclick=function(){sheet.classList.add("hidden")};
  document.getElementById("reportTabs").onclick=function(e){var b=e.target.closest("button[data-period]");if(!b)return;document.querySelectorAll("#reportTabs button").forEach(function(x){x.classList.toggle("active",x===b)});render(b.dataset.period)};
  document.addEventListener("click",function(e){if(e.target.closest(".nav-button"))setTimeout(access,0)});
  new MutationObserver(access).observe(role,{childList:true,characterData:true,subtree:true});new MutationObserver(access).observe(document.body,{childList:true,subtree:true});access();render("year");
})();
