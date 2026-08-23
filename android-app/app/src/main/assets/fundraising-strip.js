(function(){
  "use strict";
  var strip=document.getElementById("collectionStrip"),value=document.getElementById("collectionStripValue"),role=document.getElementById("role"),dash=document.getElementById("dash");
  if(!strip||!value||!role||!dash)return;
  function update(){
    var allowed=/^(Директор|Администратор)$/.test(role.textContent.trim());
    strip.classList.toggle("hidden",!allowed);
    if(!allowed)return;
    var card=dash.querySelector(".fundraising"),amount=card&&card.querySelector("strong"),rows=card&&card.querySelectorAll("p");
    if(amount){
      var percent=rows&&rows.length?rows[rows.length-1].textContent.trim():"";
      value.textContent=amount.textContent.trim()+(percent?" · "+percent:"");
    }
  }
  new MutationObserver(update).observe(document.getElementById("app"),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
  update();
})();
