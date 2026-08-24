(function(){
  "use strict";
  var scheduleScript=document.createElement("script");scheduleScript.src="schedule-ui.js";document.head.appendChild(scheduleScript);
  var strip=document.getElementById("collectionStrip"),value=document.getElementById("collectionStripValue"),role=document.getElementById("role"),dash=document.getElementById("dash");
  if(!strip||!value||!role||!dash)return;

  function parsePayload(payload){
    var d={};
    try{d=typeof payload==="string"?JSON.parse(payload):(payload||{})}catch(e){}
    var collected=Number(String(d.collected||"").replace(/\D/g,""));
    var goal=Number(String(d.goal||"").replace(/\D/g,""));
    return {collected:collected,goal:goal};
  }

  window.updateCollectionStrip=function(payload){
    var d=parsePayload(payload);
    if(!d.collected||d.collected<1)return false;
    var percent=d.goal?Math.min(100,Math.round(d.collected/d.goal*100)):0;
    value.textContent=d.collected.toLocaleString("ru-RU")+" ₽"+(d.goal?" · "+percent+"%":"");
    localStorage.setItem("akyl_collection_strip",JSON.stringify(d));
    return true;
  };

  function update(){
    var allowed=/^(Директор|Администратор)$/.test(role.textContent.trim());
    strip.classList.toggle("hidden",!allowed);
    var cached=localStorage.getItem("akyl_project_data_v2");
    if(cached&&window.updateCollectionStrip(cached))return;
    var saved=localStorage.getItem("akyl_collection_strip");
    if(saved&&window.updateCollectionStrip(saved))return;
    var card=dash.querySelector(".fundraising"),amount=card&&card.querySelector("strong"),rows=card&&card.querySelectorAll("p");
    if(amount){
      var percent=rows&&rows.length?rows[rows.length-1].textContent.trim():"";
      var nextValue=amount.textContent.trim()+(percent?" · "+percent:"");
      if(value.textContent!==nextValue)value.textContent=nextValue;
    }
  }

  new MutationObserver(update).observe(document.getElementById("app"),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  update();
  setTimeout(function(){
    if(/Обновление/.test(value.textContent)){
      var cached=localStorage.getItem("akyl_project_data_v2");
      if(!cached||!window.updateCollectionStrip(cached))value.textContent="Нет связи · нажмите";
    }
  },12000);
})();