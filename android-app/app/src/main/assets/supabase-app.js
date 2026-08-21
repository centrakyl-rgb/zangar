(function(){
  "use strict";
  var URL="https://ihevokoybbchdsujcpls.supabase.co";
  var KEY="sb_publishable_36ExgycbIBA2Hd7ZmSEu_A_65KsGs-X";
  var token="",user=null,profile=null,assignments=[];
  var $=function(id){return document.getElementById(id)};
  var esc=function(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
  async function api(path,options){
    options=options||{};var headers={"apikey":KEY,"Content-Type":"application/json"};
    if(token)headers.Authorization="Bearer "+token;
    Object.assign(headers,options.headers||{});
    var res=await fetch(URL+path,Object.assign({},options,{headers:headers}));
    var text=await res.text(),data=text?JSON.parse(text):null;
    if(!res.ok)throw new Error((data&&(data.msg||data.message||data.hint))||"Ошибка сервера");
    return data;
  }
  function showLogin(message){
    $("app").classList.add("hidden");$("login").classList.remove("hidden");
    if(message)$("error").textContent=message;
  }
  async function login(email,password){
    var data=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email:email,password:password})});
    token=data.access_token;user=data.user;
    localStorage.setItem("akyl_auth",JSON.stringify({token:token,user:user}));
    await loadProfile();
  }
  async function signup(){
    var name=$("fullName").value.trim(),email=$("username").value.trim(),password=$("password").value;
    if(!name){$("error").textContent="Укажите имя и фамилию";return}
    if(password.length<6){$("error").textContent="Пароль должен содержать не менее 6 символов";return}
    $("error").textContent="Создание аккаунта…";
    try{
      var data=await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email:email,password:password,data:{full_name:name}})});
      if(data.access_token){token=data.access_token;user=data.user;localStorage.setItem("akyl_auth",JSON.stringify({token:token,user:user}));await loadProfile()}
      else $("error").textContent="Аккаунт создан. Подтвердите почту и затем войдите.";
    }catch(err){$("error").textContent=err.message}
  }
  async function loadProfile(){
    var rows=await api("/rest/v1/profiles?id=eq."+encodeURIComponent(user.id)+"&select=id,full_name,role,active");
    if(!rows.length)throw new Error("Для этого пользователя ещё не назначена роль");
    profile=rows[0];if(!profile.active)throw new Error("Регистрация принята. Директор ещё не назначил вам роль.");
    $("login").classList.add("hidden");$("app").classList.remove("hidden");
    $("user").textContent=profile.full_name||user.email;
    $("role").textContent={director:"Директор",teacher:"Учитель",admin:"Администратор",cleaner:"Уборщик"}[profile.role];
    await render();
  }
  $("loginForm").onsubmit=async function(e){
    e.preventDefault();$("error").textContent="Подключение…";
    try{await login($("username").value.trim(),$("password").value)}
    catch(err){showLogin(err.message)}
  };
  $("signup").onclick=signup;
  $("logout").onclick=async function(){
    try{await api("/auth/v1/logout",{method:"POST"})}catch(e){}
    localStorage.removeItem("akyl_auth");token="";user=null;profile=null;$("password").value="";showLogin();
  };
  async function render(){
    $("dash").innerHTML='<div class="empty">Загрузка журнала…</div>';
    if(profile.role==="teacher")await renderTeacher();
    else if(profile.role==="director")await renderDirector();
    else if(profile.role==="cleaner")await renderCleaner();
    else await renderAdmin();
  }
  async function renderTeacher(){
    assignments=await api("/rest/v1/teacher_assignments?teacher_id=eq."+user.id+"&select=subject_id,subjects(id,name),groups(id,name,students(id,full_name,active))");
    var choices=[];
    assignments.forEach(function(a){(a.groups&&a.groups.students||[]).filter(function(s){return s.active}).forEach(function(s){choices.push({student:s,subject:a.subject,group:a.groups})})});
    var entries=await api("/rest/v1/journal_entries?teacher_id=eq."+user.id+"&select=id,lesson_date,grade,attendance,plan_text,completed_text,mistakes,quality,teacher_decision,comment,students(full_name),subjects(name)&order=lesson_date.desc&limit=60");
    var opts=choices.map(function(x){return '<option value="'+x.student.id+'|'+x.subject.id+'">'+esc(x.student.full_name)+" · "+esc(x.subject.name)+" · "+esc(x.group.name)+"</option>"}).join("");
    var rows=entries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+" · "+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+(e.grade||"без оценки")+'</span></div><p>'+esc(e.lesson_date)+" · "+attendance(e.attendance)+" · план: "+esc(e.plan_text||"—")+" · факт: "+esc(e.completed_text||"—")+" · ошибок: "+e.mistakes+"</p></div>"}).join("")||'<div class="empty">Записей пока нет</div>';
    $("dash").innerHTML='<div class="hero"><h2>Мой журнал</h2><p>Вы видите только назначенные вам группы, предметы и собственные записи.</p></div><section class="panel"><h3>Новая запись</h3>'+(choices.length?'<form id="entryForm" class="grid"><div class="full"><label>Ученик и предмет</label><select id="choice">'+opts+'</select></div><div><label>Дата</label><input id="lessonDate" type="date" required></div><div><label>Посещаемость</label><select id="att"><option value="present">На занятии</option><option value="absent">Пропуск</option><option value="ill">Болезнь</option></select></div><div><label>Оценка</label><select id="grade"><option value="">Без оценки</option><option>5</option><option>4</option><option>3</option><option>2</option></select></div><div><label>Количество ошибок</label><input id="mistakes" type="number" min="0" value="0"></div><div class="full"><label>План урока</label><input id="plan" placeholder="Новая страница + повтор"></div><div class="full"><label>Что выполнено</label><input id="completed" placeholder="Фактический объём"></div><div class="full"><label>Решение учителя</label><input id="decision" placeholder="Дальше / повторить / повысить объём"></div><div class="full"><label>Комментарий</label><textarea id="comment"></textarea></div><button class="btn green full">Сохранить в общий журнал</button></form>':'<div class="empty">Директор ещё не назначил вам группу и предмет</div>')+'</section><section class="panel"><h3>Мои последние записи</h3><div class="list">'+rows+"</div></section>";
    if(choices.length){$("lessonDate").value=new Date().toISOString().slice(0,10);$("entryForm").onsubmit=saveEntry}
    await addDailyPrompt("lessons","По всем ученикам отмечено: сдал урок или нет?");
  }
  async function saveEntry(e){
    e.preventDefault();var ids=$("choice").value.split("|"),button=e.target.querySelector("button");button.disabled=true;button.textContent="Сохранение…";
    try{
      await api("/rest/v1/journal_entries",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify({lesson_date:$("lessonDate").value,teacher_id:user.id,student_id:ids[0],subject_id:ids[1],grade:$("grade").value?Number($("grade").value):null,attendance:$("att").value,plan_text:$("plan").value.trim(),completed_text:$("completed").value.trim(),mistakes:Number($("mistakes").value||0),teacher_decision:$("decision").value.trim(),comment:$("comment").value.trim()})});
      await renderTeacher();
    }catch(err){alert(err.message);button.disabled=false;button.textContent="Сохранить в общий журнал"}
  }
  async function renderDirector(){
    var entries=await api("/rest/v1/journal_entries?select=lesson_date,grade,attendance,mistakes,students(id,full_name),subjects(name),profiles!journal_entries_teacher_id_fkey(full_name)&order=lesson_date.desc&limit=500");
    var staff=await api("/rest/v1/profiles?select=id,full_name,role,active,created_at&order=created_at.asc");
    var today=new Date().toISOString().slice(0,10);
    var checkins=await api("/rest/v1/daily_checkins?work_date=eq."+today+"&select=reporter_id,check_type,completed,problem_note,profiles(full_name,role)");
    var map={};entries.forEach(function(e){var s=e.students;if(!s)return;if(!map[s.id])map[s.id]={name:s.full_name,grades:[],present:0,absent:0,ill:0,mistakes:0,lessons:0};var x=map[s.id];x.lessons++;if(e.grade)x.grades.push(Number(e.grade));x[e.attendance]++;x.mistakes+=Number(e.mistakes||0)});
    var list=Object.keys(map).map(function(id){var x=map[id];x.avg=x.grades.length?x.grades.reduce(function(a,b){return a+b},0)/x.grades.length:0;x.rate=x.lessons?Math.round(x.present/x.lessons*100):0;return x}).sort(function(a,b){return b.rate-a.rate||b.avg-a.avg});
    var compare=list.map(function(x,i){return '<div class="item"><div class="row"><strong>'+(i+1)+". "+esc(x.name)+'</strong><span class="badge">'+(x.avg?x.avg.toFixed(1):"—")+'</span></div><p>Посещаемость: '+x.rate+"% · уроков: "+x.lessons+" · пропусков: "+x.absent+" · болезней: "+x.ill+" · ошибок: "+x.mistakes+"</p></div>"}).join("")||'<div class="empty">После первых записей учителей здесь появится сравнение</div>';
    var assignees=staff.filter(function(p){return p.role!=="director"&&p.active}).map(function(p){return '<option value="'+p.id+'">'+esc(p.full_name)+" · "+roleName(p.role)+"</option>"}).join("");
    var pending=staff.filter(function(p){return !p.active}).map(function(p){return '<div class="item"><strong>'+esc(p.full_name)+'</strong><div class="grid" style="margin-top:9px"><select data-role="'+p.id+'"><option value="teacher">Учитель</option><option value="admin">Администратор</option><option value="cleaner">Уборщик</option></select><button class="btn green" data-approve="'+p.id+'">Подтвердить</button></div></div>'}).join("")||'<div class="empty">Новых регистраций нет</div>';
    var daily=checkins.map(function(c){return '<div class="item"><div class="row"><strong>'+esc(c.profiles&&c.profiles.full_name)+'</strong><span class="badge '+(c.completed?"":"todo")+'">'+(c.completed?"Выполнено":"Есть проблема")+'</span></div><p>'+labelCheck(c.check_type)+(c.problem_note?" · "+esc(c.problem_note):"")+"</p></div>"}).join("")||'<div class="empty">Сегодня сотрудники ещё не закрывали рабочий день</div>';
    $("dash").innerHTML='<div class="hero"><h2>Успеваемость центра</h2><p>Все ученики сравниваются по посещаемости и результатам. Сравнение по Куръану будет учитывать этап обучения.</p></div><div class="stats"><div class="stat"><strong>'+list.length+'</strong><span>учеников с записями</span></div><div class="stat"><strong>'+entries.length+'</strong><span>уроков в журнале</span></div></div><section class="panel"><h3>Новые сотрудники</h3><div class="list">'+pending+'</div></section><section class="panel"><h3>Итог сегодняшнего дня</h3><div class="list">'+daily+'</div></section><section class="panel"><h3>Сравнение учеников</h3><div class="list">'+compare+'</div></section><section class="panel"><h3>Поставить задачу</h3>'+(assignees?'<form id="taskForm" class="grid"><div><label>Исполнитель</label><select id="assignee">'+assignees+'</select></div><div><label>Срок</label><input id="due" type="date"></div><div class="full"><label>Название</label><input id="taskTitle" required></div><div class="full"><label>Описание</label><textarea id="taskDescription"></textarea></div><button class="btn green full">Назначить</button></form>':'<div class="empty">Сначала добавьте сотрудников</div>')+"</section>";
    if(assignees)$("taskForm").onsubmit=saveTask;
    document.querySelectorAll("[data-approve]").forEach(function(b){b.onclick=async function(){var id=b.dataset.approve,sel=document.querySelector('[data-role="'+id+'"]');b.disabled=true;try{await api("/rest/v1/rpc/approve_staff",{method:"POST",body:JSON.stringify({p_user:id,p_role:sel.value,p_name:b.closest(".item").querySelector("strong").textContent})});await renderDirector()}catch(err){alert(err.message);b.disabled=false}}});
  }
  async function saveTask(e){
    e.preventDefault();try{await api("/rest/v1/tasks",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({created_by:user.id,assigned_to:$("assignee").value,title:$("taskTitle").value.trim(),description:$("taskDescription").value.trim(),due_date:$("due").value||null})});alert("Задача назначена");await renderDirector()}catch(err){alert(err.message)}
  }
  async function renderAdmin(){
    var tasks=await api("/rest/v1/tasks?assigned_to=eq."+user.id+"&select=id,title,description,due_date,status,profiles!tasks_created_by_fkey(full_name)&order=created_at.desc");
    var list=tasks.map(function(t){return '<div class="item"><div class="row"><strong>'+esc(t.title)+'</strong><span class="badge '+(t.status==="done"?"":"todo")+'">'+(t.status==="done"?"Выполнено":"Новая")+'</span></div><p>'+esc(t.description||"")+" · до "+esc(t.due_date||"без срока")+"</p>"+(t.status!=="done"?'<button class="btn green" data-task="'+t.id+'" style="margin-top:9px">Отметить выполненной</button>':"")+"</div>"}).join("")||'<div class="empty">Назначенных задач нет</div>';
    $("dash").innerHTML='<div class="hero"><h2>Мои задачи</h2><p>Задачи директора синхронизируются между устройствами.</p></div><section class="panel"><div class="list">'+list+"</div></section>";
    document.querySelectorAll("[data-task]").forEach(function(b){b.onclick=async function(){await api("/rest/v1/tasks?id=eq."+b.dataset.task,{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"done"})});await renderAdmin()}});
    await addDailyPrompt("admin_tasks","Задачи за сегодня обработаны?");
  }
  async function renderCleaner(){
    $("dash").innerHTML='<div class="hero"><h2>Итог рабочего дня</h2><p>Один короткий ответ вместо отдельного журнала.</p></div>';
    await addDailyPrompt("cleaning","Уборка сегодня выполнена?");
  }
  async function addDailyPrompt(type,question){
    var today=new Date().toISOString().slice(0,10),rows=await api("/rest/v1/daily_checkins?reporter_id=eq."+user.id+"&work_date=eq."+today+"&check_type=eq."+type+"&select=id,completed,problem_note"),old=rows[0];
    var section=document.createElement("section");section.className="panel";
    section.innerHTML='<h3>'+esc(question)+'</h3>'+(old?'<div class="item"><div class="row"><strong>Ответ за сегодня сохранён</strong><span class="badge '+(old.completed?"":"todo")+'">'+(old.completed?"Да":"Нет")+'</span></div><p>'+(old.problem_note?esc(old.problem_note):"Комментарий не требовался")+'</p></div>':'<form id="dailyForm" class="grid"><div class="full"><label>Ответ</label><select id="dailyCompleted"><option value="true">Да, выполнено</option><option value="false">Нет, есть проблема</option></select></div><div class="full"><label>Комментарий — только если не выполнено</label><textarea id="dailyNote" placeholder="Коротко укажите причину"></textarea></div><button class="btn green full">Закрыть рабочий день</button></form>');
    $("dash").appendChild(section);
    if(!old){$("dailyForm").onsubmit=async function(e){e.preventDefault();var completed=$("dailyCompleted").value==="true",note=$("dailyNote").value.trim();if(!completed&&!note){alert("При ответе «нет» коротко укажите причину");return}await api("/rest/v1/daily_checkins",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify({work_date:today,reporter_id:user.id,check_type:type,completed:completed,problem_note:note||null})});await render()}}
  }
  function labelCheck(x){return {lessons:"Ученики отмечены",cleaning:"Уборка",admin_tasks:"Задачи администратора"}[x]||x}
  function roleName(x){return {teacher:"учитель",admin:"администратор",cleaner:"уборщик"}[x]||x}
  function attendance(x){return {present:"на занятии",absent:"пропуск",ill:"болезнь"}[x]||x}
  try{var saved=JSON.parse(localStorage.getItem("akyl_auth")||"null");if(saved&&saved.token&&saved.user){token=saved.token;user=saved.user;loadProfile().catch(function(){localStorage.removeItem("akyl_auth");showLogin("Сеанс закончился. Войдите снова.")})}}catch(e){}
})();
