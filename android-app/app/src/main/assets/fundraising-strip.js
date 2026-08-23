(function(){
  "use strict";
  var strip=document.getElementById("collectionStrip"),value=document.getElementById("collectionStripValue"),role=document.getElementById("role"),dash=document.getElementById("dash");
  if(!strip||!value||!role||!dash)return;
  function update(){
    var allowed=/^(Директор|Администратор)$/.test(role.textContent.trim());
    strip.classList.toggle("hidden",!allowed);
    var card=dash.querySelector(".fundraising"),amount=card&&card.querySelector("strong"),rows=card&&card.querySelectorAll("p");
    if(amount){
      var percent=rows&&rows.length?rows[rows.length-1].textContent.trim():"";
      var nextValue=amount.textContent.trim()+(percent?" · "+percent:"");if(value.textContent!==nextValue)value.textContent=nextValue;
    }
    if(card){
      var panel=card.closest(".panel"),toggle=panel&&panel.querySelector(".section-toggle span"),body=panel&&panel.querySelector(".section-body");
      if(toggle&&toggle.textContent!=="Проекты центра")toggle.textContent="Проекты центра";
      if(body&&!body.querySelector(".future-projects")){
        var placeholder=document.createElement("div");placeholder.className="future-projects";placeholder.innerHTML="<strong>Проекты центра</strong>Здесь позже появятся отдельные проекты: посадка деревьев, помощь нуждающимся и другие инициативы.";
        body.appendChild(placeholder);
      }
      card.style.display="none";
      var oldLinks=panel&&panel.querySelector(".social-links");if(oldLinks)oldLinks.style.display="none";
    }
  }
  new MutationObserver(update).observe(document.getElementById("app"),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  update();
})();
