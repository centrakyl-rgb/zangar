(function(){
  "use strict";
  var days=["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
  var subjects=["Куръан","Русский","Математика","Татарский","Арабский","Информатика","Логика","История"];
  var groups=["Хазырлык","1 группа","2 группа"];
  var teachers=["Ибрагим Ягафаров","Учитель медресе"];

  function improveEditor(){
    var period=document.getElementById("schedulePeriod"),time=document.getElementById("scheduleTime"),field=document.getElementById("scheduleTimeField");
    if(period&&time&&field&&!period.dataset.freeTime){
      period.dataset.freeTime="1";period.value="custom";period.style.display="none";
      var periodWrap=period.closest("div");if(periodWrap)periodWrap.style.display="none";
      field.classList.remove("hidden");field.classList.remove("full");
      var label=field.querySelector("label");if(label)label.textContent="Время начала";
      time.value=time.value||"08:30";
    }
  }

  function addDemo(){
    var week=document.querySelector(".schedule-week");if(!week||week.dataset.demoChecked)return;
    week.dataset.demoChecked="1";
    var real=week.querySelector(".schedule-row");if(real)return;
    week.innerHTML=days.map(function(day,di){
      var lessons=[0,1,2,3].map(function(li){
        var times=["08:30","09:25","10:30","11:35"];
        return '<div class="item schedule-row"><div class="row"><strong>'+times[li]+'</strong><span class="badge">'+subjects[(di*2+li)%subjects.length]+'</span></div><p>'+groups[(di+li)%groups.length]+' · '+teachers[(di+li)%teachers.length]+' · пример</p></div>';
      }).join("");
      return '<div class="schedule-day-block" data-weekday="'+(di+1)+'"><h3 style="margin:18px 0 9px">'+day+'</h3>'+lessons+'</div>';
    }).join("");
  }

  function setupPrint(){var button=document.getElementById("printSchedule");if(!button||button.dataset.nativePrint)return;button.dataset.nativePrint="1";button.onclick=function(){var filter=document.getElementById("scheduleFilter");if(filter){filter.value="all";filter.dispatchEvent(new Event("change"))}setTimeout(function(){if(window.AkylNative&&window.AkylNative.printPage)window.AkylNative.printPage();else window.print()},150)}}\n\n  function update(){improveEditor();addDemo();setupPrint()}
  new MutationObserver(update).observe(document.getElementById("app"),{subtree:true,childList:true});
  update();
})();