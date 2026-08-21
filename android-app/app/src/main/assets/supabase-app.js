(function(){
  "use strict";
  var URL="https://ihevokoybbchdsujcpls.supabase.co";
  var KEY="sb_publishable_36ExgycbIBA2Hd7ZmSEu_A_65KsGs-X";
  var token="",refreshToken="",user=null,profile=null,assignments=[];
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
    token=data.access_token;refreshToken=data.refresh_token||"";user=data.user;saveAuth();
    await loadProfile();
  }
  function saveAuth(){localStorage.setItem("akyl_auth",JSON.stringify({token:token,refreshToken:refreshToken,user:user}))}
  async function refreshSession(){
    if(!refreshToken)throw new Error("Сеанс закончился");
    var data=await api("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:refreshToken})});
    token=data.access_token;refreshToken=data.refresh_token||refreshToken;user=data.user||user;saveAuth();
  }
  async function signup(){
    var name=$("fullName").value.trim(),email=$("username").value.trim(),password=$("password").value;
    if(!name){$("error").textContent="Укажите имя и фамилию";return}
    if(password.length<6){$("error").textContent="Пароль должен содержать не менее 6 символов";return}
    $("error").textContent="Создание аккаунта…";
    try{
      var data=await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email:email,password:password,data:{full_name:name}})});
      if(data.access_token){token=data.access_token;refreshToken=data.refresh_token||"";user=data.user;saveAuth();await loadProfile()}
      else $("error").textContent="Аккаунт создан. Подтвердите почту и затем войдите.";
    }catch(err){$("error").textContent=err.message}
  }
  async function loadProfile(){
    var rows=await api("/rest/v1/profiles?id=eq."+encodeURIComponent(user.id)+"&select=id,full_name,role,active");
    if(!rows.length)throw new Error("Для этого пользователя ещё не назначена роль");
    profile=rows[0];if(!profile.active)throw new Error("Регистрация принята. Директор ещё не назначил вам роль.");
    $("login").classList.add("hidden");$("app").classList.remove("hidden");
    $("user").textContent=profile.full_name||user.email;
    $("role").textContent={director:"Директор",deputy:"Заместитель по учебной части",teacher:"Учитель",admin:"Администратор",cleaner:"Уборщик"}[profile.role];
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
    localStorage.removeItem("akyl_auth");token="";refreshToken="";user=null;profile=null;$("password").value="";showLogin();
  };
  async function render(){
    $("dash").innerHTML='<div class="empty">Загрузка журнала…</div>';
    if(profile.role==="teacher")await renderTeacher();
    else if(profile.role==="director")await renderDirector();
    else if(profile.role==="deputy")await renderDeputy();
    else if(profile.role==="cleaner")await renderCleaner();
    else await renderAdmin();
  }
  async function renderTeacher(){
    assignments=await api("/rest/v1/teacher_assignments?teacher_id=eq."+user.id+"&select=subject_id,subjects(id,name),groups(id,name,students(id,full_name,active))");
    var choices=[];
    assignments.forEach(function(a){(a.groups&&a.groups.students||[]).filter(function(s){return s.active}).forEach(function(s){choices.push({student:s,subject:a.subjects,group:a.groups})})});
    var entries=await api("/rest/v1/journal_entries?teacher_id=eq."+user.id+"&select=id,lesson_date,grade,attendance,lesson_status,plan_text,completed_text,mistakes,quality,teacher_decision,comment,students(full_name),subjects(name)&order=lesson_date.desc&limit=60");
    var studentIds=[];choices.forEach(function(x){if(studentIds.indexOf(x.student.id)<0)studentIds.push(x.student.id)});
    var otherEntries=studentIds.length?await api("/rest/v1/journal_entries?student_id=in.("+studentIds.join(",")+")&select=lesson_date,grade,attendance,lesson_status,students(full_name),subjects(name)&order=lesson_date.desc&limit=100"):[];
    var opts=choices.map(function(x){return '<option value="'+x.student.id+'|'+x.subject.id+'">'+esc(x.student.full_name)+" · "+esc(x.subject.name)+" · "+esc(x.group.name)+"</option>"}).join("");
    var rows=entries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+" · "+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+lessonStatus(e.lesson_status,e.attendance)+'</span></div><p>'+esc(e.lesson_date)+" · "+attendance(e.attendance)+" · план: "+esc(e.plan_text||"—")+" · факт: "+esc(e.completed_text||"—")+" · ошибок: "+e.mistakes+"</p></div>"}).join("")||'<div class="empty">Записей пока нет</div>';
    var emptyMessage=assignments.length?'В назначенной группе пока нет учеников. Директору нужно добавить хотя бы одного ученика.':'Директор ещё не назначил вам группу и предмет';
    var latest={};entries.forEach(function(e){var key=(e.students&&e.students.full_name)+"|"+(e.subjects&&e.subjects.name);if(!latest[key])latest[key]=e});
    var quick=choices.map(function(x,i){var old=latest[x.student.full_name+"|"+x.subject.name],plan=old&&(old.teacher_decision||old.completed_text||old.plan_text)||"";return '<div class="item"><strong>'+esc(x.student.full_name)+'</strong><p>'+esc(x.subject.name)+' · '+esc(x.group.name)+'</p><label>Сегодня должен сдать</label><input class="quickPlan" data-i="'+i+'" value="'+esc(plan)+'" placeholder="Учитель может изменить план"><label style="margin-top:9px">Результат</label><select class="quickStatus" data-i="'+i+'"><option value="passed">Сдал урок</option><option value="unprepared">Не подготовил урок</option><option value="absent">Отсутствует</option><option value="ill">Болен</option></select></div>'}).join("");
    var otherRows=otherEntries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+' · '+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+lessonStatus(e.lesson_status,e.attendance)+'</span></div><p>'+esc(e.lesson_date)+(e.grade?' · оценка '+e.grade:'')+'</p></div>'}).join("")||'<div class="empty">По другим предметам записей пока нет</div>';
    $("dash").innerHTML='<div class="hero"><h2>Мой журнал</h2><p>Вы редактируете свои предметы и можете посмотреть общий прогресс учеников своей группы.</p></div>'+(choices.length?'<section class="panel"><h3>Быстрая отметка всего класса</h3><p>По умолчанию все сдали. Измените только тех, кто не сдал.</p><form id="quickForm"><div class="list">'+quick+'</div><button class="btn green" style="margin-top:12px;width:100%">Сохранить отметки за сегодня</button></form></section>':'')+'<section class="panel"><h3>Подробная запись</h3>'+(choices.length?'<form id="entryForm" class="grid"><div class="full"><label>Ученик и предмет</label><select id="choice">'+opts+'</select></div><div><label>Дата</label><input id="lessonDate" type="date" required></div><div><label>Посещаемость</label><select id="att"><option value="present">На занятии</option><option value="absent">Пропуск</option><option value="ill">Болезнь</option></select></div><div><label>Оценка</label><select id="grade"><option value="">Без оценки</option><option>5</option><option>4</option><option>3</option><option>2</option></select></div><div><label>Количество ошибок</label><input id="mistakes" type="number" min="0" value="0"></div><div class="full"><label>План урока</label><input id="plan" placeholder="Новая страница + повтор"></div><div class="full"><label>Что выполнено</label><input id="completed" placeholder="Фактический объём"></div><div class="full"><label>Решение учителя</label><input id="decision" placeholder="План следующего урока"></div><div class="full"><label>Комментарий</label><textarea id="comment"></textarea></div><button class="btn green full">Сохранить в общий журнал</button></form>':'<div class="empty">'+emptyMessage+'</div>')+'</section><section class="panel"><h3>Прогресс моих учеников по всем предметам</h3><div class="list">'+otherRows+'</div></section><section class="panel"><h3>Мои последние записи</h3><div class="list">'+rows+"</div></section>";
    if(choices.length){$("lessonDate").value=new Date().toISOString().slice(0,10);$("entryForm").onsubmit=saveEntry;$("quickForm").onsubmit=function(e){saveQuickClass(e,choices)}}
    await addDailyPrompt("lessons","По всем ученикам отмечено: сдал урок или нет?");
  }
  async function saveQuickClass(e,choices){
    e.preventDefault();var button=e.target.querySelector("button"),today=new Date().toISOString().slice(0,10);button.disabled=true;button.textContent="Сохранение…";
    try{
      var rows=Array.from(document.querySelectorAll(".quickStatus")).map(function(s){var i=Number(s.dataset.i),x=choices[i],status=s.value,plan=document.querySelector('.quickPlan[data-i="'+i+'"]').value.trim();return {lesson_date:today,teacher_id:user.id,student_id:x.student.id,subject_id:x.subject.id,attendance:status==="ill"?"ill":status==="absent"?"absent":"present",lesson_status:status,plan_text:plan,mistakes:0,comment:status==="unprepared"?"Не подготовил урок":null}});
      await api("/rest/v1/journal_entries?on_conflict=lesson_date,teacher_id,student_id,subject_id",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify(rows)});await renderTeacher();
    }catch(err){alert(err.message);button.disabled=false;button.textContent="Сохранить отметки за сегодня"}
  }
  async function saveEntry(e){
    e.preventDefault();var ids=$("choice").value.split("|"),button=e.target.querySelector("button");button.disabled=true;button.textContent="Сохранение…";
    try{
      await api("/rest/v1/journal_entries",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify({lesson_date:$("lessonDate").value,teacher_id:user.id,student_id:ids[0],subject_id:ids[1],grade:$("grade").value?Number($("grade").value):null,attendance:$("att").value,lesson_status:$("att").value==="ill"?"ill":$("att").value==="absent"?"absent":"passed",plan_text:$("plan").value.trim(),completed_text:$("completed").value.trim(),mistakes:Number($("mistakes").value||0),teacher_decision:$("decision").value.trim(),comment:$("comment").value.trim()})});
      await renderTeacher();
    }catch(err){alert(err.message);button.disabled=false;button.textContent="Сохранить в общий журнал"}
  }
  async function renderDirector(){
    var entries=await api("/rest/v1/journal_entries?select=lesson_date,grade,attendance,lesson_status,mistakes,students(id,full_name),subjects(name),profiles!journal_entries_teacher_id_fkey(full_name)&order=lesson_date.desc&limit=500");
    var staff=await api("/rest/v1/profiles?select=id,full_name,role,active,created_at&order=created_at.asc");
    var groups=await api("/rest/v1/groups?select=id,name,students(id,full_name)&active=eq.true&order=name.asc");
    var subjects=await api("/rest/v1/subjects?select=id,name&order=name.asc");
    var teacherAssignments=await api("/rest/v1/teacher_assignments?select=teacher_id,groups(name),subjects(name)");
    var today=new Date().toISOString().slice(0,10);
    var checkins=await api("/rest/v1/daily_checkins?work_date=eq."+today+"&select=reporter_id,check_type,completed,problem_note,profiles(full_name,role)");
    var map={};entries.forEach(function(e){var s=e.students;if(!s)return;if(!map[s.id])map[s.id]={name:s.full_name,grades:[],present:0,absent:0,ill:0,passed:0,unprepared:0,mistakes:0,lessons:0};var x=map[s.id];x.lessons++;if(e.grade)x.grades.push(Number(e.grade));x[e.attendance]++;if(e.lesson_status==="passed")x.passed++;if(e.lesson_status==="unprepared")x.unprepared++;x.mistakes+=Number(e.mistakes||0)});
    var list=Object.keys(map).map(function(id){var x=map[id];x.avg=x.grades.length?x.grades.reduce(function(a,b){return a+b},0)/x.grades.length:0;x.rate=x.lessons?Math.round(x.present/x.lessons*100):0;return x}).sort(function(a,b){return b.rate-a.rate||b.avg-a.avg});
    var compare=list.map(function(x,i){return '<div class="item"><div class="row"><strong>'+(i+1)+". "+esc(x.name)+'</strong><span class="badge">'+(x.avg?x.avg.toFixed(1):"—")+'</span></div><p>Сдал: '+x.passed+" · не подготовил: "+x.unprepared+" · пропусков: "+x.absent+" · болезней: "+x.ill+" · ошибок: "+x.mistakes+"</p></div>"}).join("")||'<div class="empty">После первых записей учителей здесь появится сравнение</div>';
    var assignees=staff.filter(function(p){return p.role!=="director"&&p.active}).map(function(p){return '<option value="'+p.id+'">'+esc(p.full_name)+" · "+staffLabel(p,teacherAssignments)+"</option>"}).join("");
    var pending=staff.filter(function(p){return !p.active}).map(function(p){return '<div class="item"><strong>'+esc(p.full_name)+'</strong><div class="grid" style="margin-top:9px"><select data-role="'+p.id+'"><option value="teacher">Учитель</option><option value="deputy">Заместитель по учебной части</option><option value="admin">Администратор</option><option value="cleaner">Уборщик</option></select><button class="btn green" data-approve="'+p.id+'">Подтвердить</button></div></div>'}).join("")||'<div class="empty">Новых регистраций нет</div>';
    var teachers=staff.filter(function(p){return p.role==="teacher"&&p.active});
    var groupOptions=groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>'}).join("");
    var subjectOptions=subjects.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join("");
    var teacherOptions=teachers.map(function(t){return '<option value="'+t.id+'">'+esc(t.full_name)+'</option>'}).join("");
    var assignmentList=teacherAssignments.map(function(a){var t=staff.find(function(p){return p.id===a.teacher_id});return '<div class="item"><strong>'+esc(t&&t.full_name)+'</strong><p>'+esc(a.subjects&&a.subjects.name)+" · "+esc(a.groups&&a.groups.name)+"</p></div>"}).join("")||'<div class="empty">Назначений пока нет</div>';
    var daily=checkins.map(function(c){return '<div class="item"><div class="row"><strong>'+esc(c.profiles&&c.profiles.full_name)+'</strong><span class="badge '+(c.completed?"":"todo")+'">'+(c.completed?"Выполнено":"Есть проблема")+'</span></div><p>'+labelCheck(c.check_type)+(c.problem_note?" · "+esc(c.problem_note):"")+"</p></div>"}).join("")||'<div class="empty">Сегодня сотрудники ещё не закрывали рабочий день</div>';
    $("dash").innerHTML='<div class="hero"><h2>Успеваемость центра</h2><p>Все ученики сравниваются по посещаемости и результатам. Сравнение по Куръану учитывает этап обучения.</p></div><div class="stats"><div class="stat"><strong>'+list.length+'</strong><span>учеников с записями</span></div><div class="stat"><strong>'+entries.length+'</strong><span>уроков в журнале</span></div></div><section class="panel"><h3>Новые сотрудники</h3><div class="list">'+pending+'</div></section><section class="panel"><h3>Группы и ученики</h3><form id="groupForm" class="grid"><div><label>Новая группа</label><input id="groupName" placeholder="Например: Старшая группа" required></div><button class="btn green">Добавить группу</button></form>'+(groups.length?'<form id="studentForm" class="grid" style="margin-top:12px"><div><label>Имя ученика</label><input id="studentName" required></div><div><label>Группа</label><select id="studentGroup">'+groupOptions+'</select></div><button class="btn green full">Добавить ученика</button></form>':'<div class="empty">Сначала создайте группу</div>')+'</section><section class="panel"><h3>Предметы учителей</h3>'+(teachers.length&&groups.length?'<form id="assignmentForm" class="grid"><div><label>Учитель</label><select id="assignTeacher">'+teacherOptions+'</select></div><div><label>Группа</label><select id="assignGroup">'+groupOptions+'</select></div><div><label>Предмет</label><select id="assignSubject">'+subjectOptions+'</select></div><button class="btn green">Назначить</button></form>':'<div class="empty">Нужны подтверждённый учитель и группа</div>')+'<div class="list" style="margin-top:12px">'+assignmentList+'</div></section><section class="panel"><h3>Итог сегодняшнего дня</h3><div class="list">'+daily+'</div></section><section class="panel"><h3>Сравнение учеников</h3><div class="list">'+compare+'</div></section><section class="panel"><h3>Поставить задачу</h3>'+(assignees?'<form id="taskForm" class="grid"><div><label>Исполнитель</label><select id="assignee">'+assignees+'</select></div><div><label>Срок</label><input id="due" type="date"></div><div class="full"><label>Название</label><input id="taskTitle" required></div><div class="full"><label>Описание</label><textarea id="taskDescription"></textarea></div><button class="btn green full">Назначить</button></form>':'<div class="empty">Сначала добавьте сотрудников</div>')+"</section>";
    if(assignees)$("taskForm").onsubmit=saveTask;
    $("groupForm").onsubmit=saveGroup;
    if(groups.length)$("studentForm").onsubmit=saveStudent;
    if(teachers.length&&groups.length)$("assignmentForm").onsubmit=saveAssignment;
    document.querySelectorAll("[data-approve]").forEach(function(b){b.onclick=async function(){var id=b.dataset.approve,sel=document.querySelector('[data-role="'+id+'"]');b.disabled=true;try{await api("/rest/v1/rpc/approve_staff",{method:"POST",body:JSON.stringify({p_user:id,p_role:sel.value,p_name:b.closest(".item").querySelector("strong").textContent})});await renderDirector()}catch(err){alert(err.message);b.disabled=false}}});
  }
  async function renderDeputy(){
    var entries=await api("/rest/v1/journal_entries?select=lesson_date,grade,attendance,lesson_status,students(full_name),subjects(name),profiles!journal_entries_teacher_id_fkey(full_name)&order=lesson_date.desc&limit=500");
    var rows=entries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+' · '+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+lessonStatus(e.lesson_status,e.attendance)+'</span></div><p>'+esc(e.lesson_date)+' · учитель: '+esc(e.profiles&&e.profiles.full_name)+(e.grade?' · оценка '+e.grade:'')+'</p></div>'}).join("")||'<div class="empty">Записей пока нет</div>';
    $("dash").innerHTML='<div class="hero"><h2>Учебная часть</h2><p>Все журналы учеников по всем предметам.</p></div><section class="panel"><h3>Общий журнал</h3><div class="list">'+rows+'</div></section>';
  }
  async function saveTask(e){
    e.preventDefault();try{await api("/rest/v1/tasks",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({created_by:user.id,assigned_to:$("assignee").value,title:$("taskTitle").value.trim(),description:$("taskDescription").value.trim(),due_date:$("due").value||null})});alert("Задача назначена");await renderDirector()}catch(err){alert(err.message)}
  }
  async function saveGroup(e){
    e.preventDefault();try{await api("/rest/v1/groups",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({name:$("groupName").value.trim()})});await renderDirector()}catch(err){alert(err.message)}
  }
  async function saveStudent(e){
    e.preventDefault();try{await api("/rest/v1/students",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({full_name:$("studentName").value.trim(),group_id:$("studentGroup").value})});await renderDirector()}catch(err){alert(err.message)}
  }
  async function saveAssignment(e){
    e.preventDefault();try{await api("/rest/v1/teacher_assignments",{method:"POST",headers:{"Prefer":"return=minimal,resolution=ignore-duplicates"},body:JSON.stringify({teacher_id:$("assignTeacher").value,group_id:$("assignGroup").value,subject_id:$("assignSubject").value})});await renderDirector()}catch(err){alert(err.message)}
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
  function roleName(x){return {teacher:"учитель",deputy:"заместитель по учебной части",admin:"администратор",cleaner:"уборщик"}[x]||x}
  function staffLabel(p,a){if(p.role!=="teacher")return roleName(p.role);var own=a.filter(function(x){return x.teacher_id===p.id});if(!own.length)return "учитель · предмет не назначен";return own.map(function(x){return "учитель "+(x.subjects&&x.subjects.name)+" · "+(x.groups&&x.groups.name)}).join(", ")}
  function attendance(x){return {present:"на занятии",absent:"пропуск",ill:"болезнь"}[x]||x}
  function lessonStatus(x,a){return {passed:"сдал",unprepared:"не подготовил",absent:"отсутствует",ill:"болен"}[x]||attendance(a)}
  var pullStart=0,pullReady=false;
  document.addEventListener("touchstart",function(e){if(window.scrollY===0&&profile){pullStart=e.touches[0].clientY;pullReady=false}}, {passive:true});
  document.addEventListener("touchmove",function(e){if(!pullStart)return;var distance=e.touches[0].clientY-pullStart;if(distance>85){pullReady=true;var d=$("pullRefresh");if(!d){d=document.createElement("div");d.id="pullRefresh";d.className="empty";d.style.cssText="position:fixed;top:8px;left:25%;width:50%;z-index:20;background:#fff;border-radius:20px;box-shadow:0 4px 18px #0002";document.body.appendChild(d)}d.textContent="Отпустите, чтобы обновить"}}, {passive:true});
  document.addEventListener("touchend",async function(){var d=$("pullRefresh");if(d)d.remove();var ready=pullReady;pullStart=0;pullReady=false;if(ready&&profile){$("dash").innerHTML='<div class="empty">Обновление…</div>';try{await render()}catch(err){alert(err.message)}}}, {passive:true});
  try{var saved=JSON.parse(localStorage.getItem("akyl_auth")||"null");if(saved&&saved.user){token=saved.token||"";refreshToken=saved.refreshToken||"";user=saved.user;loadProfile().catch(async function(){try{await refreshSession();await loadProfile()}catch(err){localStorage.removeItem("akyl_auth");showLogin("Войдите снова.")}})}}catch(e){}
})();
