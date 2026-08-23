(function(){
  "use strict";
  var URL="https://ihevokoybbchdsujcpls.supabase.co";
  var KEY="sb_publishable_36ExgycbIBA2Hd7ZmSEu_A_65KsGs-X";
  var token="",refreshToken="",user=null,profile=null,assignments=[],loginDirectory=[],projectRefreshStarted=false,activeNav="home";
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
    var nav=document.querySelector(".dashboard-nav");if(nav)nav.remove();
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
  async function loadLoginDirectory(){try{loginDirectory=await api("/rest/v1/rpc/login_directory",{method:"POST",body:"{}"});renderLoginPeople()}catch(e){$("loginPerson").innerHTML='<option value="">Сначала выполните обновление базы</option>'}}
  function renderLoginPeople(){var role=$("loginRole").value,people=loginDirectory.filter(function(p){return p.role===role});$("loginPerson").innerHTML=people.map(function(p){return '<option value="'+esc(p.login_email)+'">'+esc(p.full_name)+'</option>'}).join('')||'<option value="">Сотрудники не добавлены</option>';$("personField").classList.toggle("hidden",people.length===1)}
  async function loadProfile(){
    var rows=await api("/rest/v1/profiles?id=eq."+encodeURIComponent(user.id)+"&select=id,full_name,role,active,is_deputy,deputy_scope");
    if(!rows.length)throw new Error("Для этого пользователя ещё не назначена роль");
    profile=rows[0];if(!profile.active)throw new Error("Регистрация принята. Директор ещё не назначил вам роль.");
    $("login").classList.add("hidden");$("app").classList.remove("hidden");
    $("user").textContent=profile.full_name||user.email;
    var scopeName={religious:"зам по религиозным наукам",secular:"зам по светским наукам",both:"зам по всем учебным направлениям"}[profile.deputy_scope]||"заместитель по учебной части";
    $("role").textContent=profile.is_deputy&&profile.role==="teacher"?"Учитель · "+scopeName:({director:"Директор",deputy:"Заместитель по учебной части",teacher:"Учитель",educator:"Воспитатель",admin:"Администратор",cleaner:"Уборщик"}[profile.role]);
    await render();
  }
  $("loginForm").onsubmit=async function(e){
    e.preventDefault();$("error").textContent="Подключение…";
    var email=$("loginPerson").value;if(!email){$("error").textContent="Выберите сотрудника";return}
    var passKey="akyl_saved_password_"+email,savedPassword=localStorage.getItem(passKey)||"",password=$("password").value||savedPassword;
    if(!password){$("passwordOnce").classList.remove("hidden");$("error").textContent="Для первого входа введите пароль один раз";$("password").focus();return}
    try{await login(email,password);localStorage.setItem(passKey,password);$("passwordOnce").classList.add("hidden");$("password").value=""}
    catch(err){localStorage.removeItem(passKey);$("passwordOnce").classList.remove("hidden");$("error").textContent="Введите пароль один раз для этого сотрудника"}
  };
  $("loginRole").onchange=function(){renderLoginPeople();$("passwordOnce").classList.add("hidden");$("password").value="";$("error").textContent=""};
  $("loginPerson").onchange=function(){$("passwordOnce").classList.add("hidden");$("password").value="";$("error").textContent=""};
  $("logout").onclick=async function(){
    try{await api("/auth/v1/logout",{method:"POST"})}catch(e){}
    localStorage.removeItem("akyl_auth");token="";refreshToken="";user=null;profile=null;$("password").value="";showLogin();await loadLoginDirectory();
  };
  async function render(){
    var oldNav=document.querySelector(".dashboard-nav");if(oldNav)oldNav.remove();
    $("dash").innerHTML='<div class="empty">Загрузка журнала…</div>';
    if(profile.role==="teacher")await renderTeacher();
    else if(profile.role==="director")await renderDirector();
    else if(profile.role==="deputy")await renderDeputy();
    else if(profile.role==="educator")await renderEducator();
    else if(profile.role==="cleaner")await renderCleaner();
    else await renderAdmin();
    addProjectsSection();
    if(["director","deputy","teacher","educator"].indexOf(profile.role)>=0)await addStudentDossier();
    addPasswordSection();
    $("dash").querySelectorAll(":scope > .hero").forEach(function(x){x.remove()});
    makeSectionsMenu();
    setupHelp();
    await renderHeaderNotifications();
  }
  function addProjectsSection(){
    var section=document.createElement("section");section.className="panel";section.innerHTML='<h3>Проекты и сбор</h3><div id="projectContent"><div class="empty">Обновляем сумму с сайта…</div></div>';$("dash").appendChild(section);
    var cached=localStorage.getItem("akyl_project_data_v2");if(cached)renderProjectData(cached);if(window.AkylNative){window.AkylNative.refreshProjects();if(!projectRefreshStarted){projectRefreshStarted=true;setInterval(function(){window.AkylNative.refreshProjects()},30*60*1000)}}
  }
  window.receiveProjectData=function(payload){localStorage.removeItem("akyl_project_data");localStorage.setItem("akyl_project_data_v2",payload);renderProjectData(payload)};
  function renderProjectData(payload){
    var box=$("projectContent");if(!box)return;var d={};try{d=JSON.parse(payload)}catch(e){}var collected=Number(String(d.collected||"").replace(/[^0-9.]/g,"")),goal=Number(String(d.goal||"").replace(/[^0-9.]/g,"")),percent=goal?Math.min(100,Math.round(collected/goal*100)):0;
    var amount=collected?collected.toLocaleString("ru-RU")+" ₽":"Сумма на сайте",goalText=goal?"Цель: "+goal.toLocaleString("ru-RU")+" ₽":"Данные автоматически обновляются с сайта";
    var links=[{n:"Открыть сайт",u:d.site||"https://mechet-zangar.ru/"},{n:"Telegram",u:d.telegram},{n:"MAX",u:d.max},{n:"ВКонтакте",u:d.vk}].filter(function(x){return x.u});
    box.innerHTML='<div class="fundraising"><span>Собрано</span><strong>'+esc(amount)+'</strong><p>'+esc(goalText)+'</p>'+(goal?'<div class="progress"><span style="width:'+percent+'%"></span></div><p style="margin-bottom:0">'+percent+'% от цели</p>':'')+'</div><div class="social-links">'+links.map(function(x){return '<a class="btn" href="'+esc(x.u)+'">'+esc(x.n)+'</a>'}).join('')+'</div>';
  }
  function setupHelp(){
    var texts={director:"Расписание — просмотр занятий.\nПоставить задачу — поручения сотрудникам.\nКонтрольная сдача джуза — итоговая проверка на 100 баллов.\nДосье ученика — полная история обучения и сдач.",deputy:"Создавайте группы и добавляйте учеников. Проверяйте журналы, расписание и досье каждого ученика.",teacher:"Открывайте свой журнал, отмечайте сдачу урока и причину несдачи. В досье можно посмотреть историю ученика по доступным предметам.",educator:"Добавляйте воспитательные записи и контролируйте дежурства учеников.",admin:"Открывайте назначенные директором задачи и отмечайте их выполнение.",cleaner:"В конце рабочего дня подтвердите уборку или коротко укажите проблему."};
    $("helpText").textContent=texts[profile.role]||"Выберите нужный раздел на главном экране.";$("helpButton").onclick=function(e){e.stopPropagation();$("notificationPopover").classList.add("hidden");$("helpPopover").classList.toggle("hidden")};
  }
  async function safeApi(path){try{return await api(path)}catch(e){return []}}
  async function addStudentDossier(){
    var students=await safeApi("/rest/v1/students?active=eq.true&select=id,full_name,groups(name)&order=full_name.asc");if(!students.length)return;
    var section=document.createElement("section");section.className="panel";section.innerHTML='<h3>Досье ученика</h3><label>Ученик</label><select id="dossierStudent">'+students.map(function(s){return '<option value="'+s.id+'">'+esc(s.full_name)+(s.groups&&s.groups.name?' · '+esc(s.groups.name):'')+'</option>'}).join('')+'</select><div id="dossierBody" style="margin-top:12px"><div class="empty">Загрузка истории…</div></div>';
    $("dash").appendChild(section);$("dossierStudent").onchange=loadStudentDossier;await loadStudentDossier();
  }
  async function loadStudentDossier(){
    var id=$("dossierStudent").value,body=$("dossierBody");if(!id||!body)return;body.innerHTML='<div class="empty">Загрузка истории…</div>';
    var data=await Promise.all([
      safeApi("/rest/v1/journal_entries?student_id=eq."+id+"&select=lesson_date,grade,attendance,lesson_status,plan_text,completed_text,teacher_decision,comment,subjects(name),profiles!journal_entries_teacher_id_fkey(full_name)&order=lesson_date.desc&limit=300"),
      safeApi("/rest/v1/juz_assessments?student_id=eq."+id+"&select=assessment_date,juz_number,hifz_errors,tajwid_errors,score,decision&order=assessment_date.desc&limit=100"),
      safeApi("/rest/v1/educator_notes?student_id=eq."+id+"&select=note_date,category,note,profiles!educator_notes_educator_id_fkey(full_name)&order=note_date.desc&limit=100"),
      safeApi("/rest/v1/duty_assignments?student_id=eq."+id+"&select=duty_date,duty_type,status,rating&order=duty_date.desc&limit=100")
    ]),entries=data[0],assessments=data[1],notes=data[2],duties=data[3],passed=entries.filter(function(x){return x.lesson_status==='passed'}).length,absent=entries.filter(function(x){return x.attendance==='absent'}).length,ill=entries.filter(function(x){return x.attendance==='ill'}).length,latest=entries[0];
    var exams=assessments.map(function(a){return '<div class="item"><div class="row"><strong>'+a.juz_number+' джуз · '+esc(a.assessment_date)+'</strong><span class="badge">'+a.score+' баллов</span></div><p>Хифз: '+a.hifz_errors+' · таджвид: '+a.tajwid_errors+' · '+esc(a.decision||'')+'</p></div>'}).join('')||'<div class="empty">Сдач джузов пока нет</div>';
    var lessons=entries.slice(0,30).map(function(x){return '<div class="item"><div class="row"><strong>'+esc(x.subjects&&x.subjects.name)+' · '+esc(x.lesson_date)+'</strong><span class="badge">'+lessonStatus(x.lesson_status,x.attendance)+'</span></div><p>План: '+esc(x.plan_text||'—')+' · выполнено: '+esc(x.completed_text||'—')+(x.teacher_decision?' · '+esc(x.teacher_decision):'')+'</p></div>'}).join('')||'<div class="empty">Уроков пока нет</div>';
    var noteRows=notes.map(function(n){return '<div class="item"><strong>'+esc(n.category)+' · '+esc(n.note_date)+'</strong><p>'+esc(n.note)+(n.profiles?' · '+esc(n.profiles.full_name):'')+'</p></div>'}).join('')||'<div class="empty">Записей воспитателя нет</div>';
    var dutyRows=duties.slice(0,20).map(function(d){return '<div class="item"><strong>'+(d.duty_type==='class'?'Дежурство в классе':'Дежурство в столовой')+' · '+esc(d.duty_date)+'</strong><p>'+esc(d.status)+(d.rating?' · оценка: '+esc(d.rating):'')+'</p></div>'}).join('')||'<div class="empty">Дежурств пока нет</div>';
    body.innerHTML='<div class="stats"><div class="stat"><strong>'+entries.length+'</strong><span>уроков</span></div><div class="stat"><strong>'+passed+'</strong><span>сдано</span></div><div class="stat"><strong>'+absent+'</strong><span>пропусков</span></div><div class="stat"><strong>'+ill+'</strong><span>болезней</span></div></div>'+(latest?'<div class="item" style="margin-top:12px"><strong>Текущий план</strong><p>'+esc(latest.subjects&&latest.subjects.name)+' · '+esc(latest.plan_text||latest.completed_text||'План ещё не указан')+'</p></div>':'')+'<h3 style="margin-top:16px">Сдача джузов / Рашида</h3><div class="list">'+exams+'</div><h3 style="margin-top:16px">История уроков</h3><div class="list">'+lessons+'</div><h3 style="margin-top:16px">Воспитательная работа</h3><div class="list">'+noteRows+'</div><h3 style="margin-top:16px">Дежурства</h3><div class="list">'+dutyRows+'</div>';
  }
  function addPasswordSection(){
    var section=document.createElement("section");section.className="panel";section.innerHTML='<h3>Безопасность</h3><form id="changePasswordForm"><label>Новый пароль</label><input id="newOwnPassword" type="password" minlength="6" required placeholder="Не менее 6 знаков"><label>Повторите новый пароль</label><input id="repeatOwnPassword" type="password" minlength="6" required><button class="btn green" style="width:100%;margin-top:12px">Сменить пароль</button></form>';
    $("dash").appendChild(section);$("changePasswordForm").onsubmit=changeOwnPassword;
  }
  async function changeOwnPassword(e){
    e.preventDefault();var first=$("newOwnPassword").value,second=$("repeatOwnPassword").value,button=e.target.querySelector("button");
    if(first!==second){alert("Пароли не совпадают");return}if(first.length<6){alert("Пароль должен содержать не менее 6 знаков");return}
    button.disabled=true;button.textContent="Сохранение…";
    try{await api("/auth/v1/user",{method:"PUT",body:JSON.stringify({password:first})});if(user&&user.email)localStorage.setItem("akyl_saved_password_"+user.email,first);alert("Пароль изменён");e.target.reset()}
    catch(err){alert(err.message)}finally{button.disabled=false;button.textContent="Сменить пароль"}
  }
  async function renderHeaderNotifications(){
    var rows=[];try{rows=await api("/rest/v1/notifications?recipient_id=eq."+user.id+"&select=id,title,message,created_at&order=created_at.desc&limit=30")}catch(e){}
    var key="akyl_read_notifications_"+user.id,read=JSON.parse(localStorage.getItem(key)||"[]"),unread=rows.filter(function(n){return read.indexOf(n.id)<0});
    $("notificationCount").textContent=unread.length>99?"99+":String(unread.length);$("notificationCount").classList.toggle("hidden",!unread.length);
    $("notificationList").innerHTML=rows.map(function(n){return '<div class="item"><strong>'+esc(n.title)+'</strong><p>'+esc(n.message)+' · '+new Date(n.created_at).toLocaleString('ru-RU')+'</p></div>'}).join("")||'<div class="empty">Новых уведомлений нет</div>';
    $("notificationBell").onclick=function(e){e.stopPropagation();$("helpPopover").classList.add("hidden");var pop=$("notificationPopover"),opening=pop.classList.contains("hidden");pop.classList.toggle("hidden");if(opening){localStorage.setItem(key,JSON.stringify(rows.map(function(n){return n.id})));$("notificationCount").classList.add("hidden")}};
  }
  document.addEventListener("click",function(e){if(e.target.closest(".bell-wrap"))return;["notificationPopover","helpPopover"].forEach(function(id){var p=$(id);if(p)p.classList.add("hidden")})});
  async function renderTeacher(){
    assignments=await api("/rest/v1/teacher_assignments?teacher_id=eq."+user.id+"&select=subject_id,subjects(id,name),groups(id,name,students(id,full_name,active))");
    var delegated=await api("/rest/v1/teacher_delegations?substitute_teacher_id=eq."+user.id+"&active=eq.true&select=subject_id,subjects(id,name),groups(id,name,students(id,full_name,active)),end_date");
    delegated.filter(function(a){return !a.end_date||a.end_date>=new Date().toISOString().slice(0,10)}).forEach(function(a){assignments.push(a)});
    var choices=[];
    assignments.forEach(function(a){(a.groups&&a.groups.students||[]).filter(function(s){return s.active}).forEach(function(s){choices.push({student:s,subject:a.subjects,group:a.groups})})});
    var entries=await api("/rest/v1/journal_entries?teacher_id=eq."+user.id+"&select=id,lesson_date,grade,attendance,lesson_status,plan_text,completed_text,quality,teacher_decision,comment,students(full_name),subjects(name)&order=lesson_date.desc&limit=60");
    var studentIds=[];choices.forEach(function(x){if(studentIds.indexOf(x.student.id)<0)studentIds.push(x.student.id)});
    var otherEntries=studentIds.length?await api("/rest/v1/journal_entries?student_id=in.("+studentIds.join(",")+")&select=lesson_date,grade,attendance,lesson_status,students(full_name),subjects(name)&order=lesson_date.desc&limit=100"):[];
    var opts=choices.map(function(x){return '<option value="'+x.student.id+'|'+x.subject.id+'">'+esc(x.student.full_name)+" · "+esc(x.subject.name)+" · "+esc(x.group.name)+"</option>"}).join("");
    var rows=entries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+" · "+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+lessonStatus(e.lesson_status,e.attendance)+'</span></div><p>'+esc(e.lesson_date)+" · "+attendance(e.attendance)+" · план: "+esc(e.plan_text||"—")+" · факт: "+esc(e.completed_text||"—")+"</p></div>"}).join("")||'<div class="empty">Записей пока нет</div>';
    var emptyMessage=assignments.length?'В назначенной группе пока нет учеников. Директору нужно добавить хотя бы одного ученика.':'Директор ещё не назначил вам группу и предмет';
    var latest={};entries.forEach(function(e){var key=(e.students&&e.students.full_name)+"|"+(e.subjects&&e.subjects.name);if(!latest[key])latest[key]=e});
    var quick=choices.map(function(x,i){var old=latest[x.student.full_name+"|"+x.subject.name],plan=old&&(old.teacher_decision||old.completed_text||old.plan_text)||"";return '<div class="item"><strong>'+esc(x.student.full_name)+'</strong><p>'+esc(x.subject.name)+' · '+esc(x.group.name)+'</p><label>Сегодня должен сдать</label><input class="quickPlan" data-i="'+i+'" value="'+esc(plan)+'" placeholder="Учитель может изменить план"><label style="margin-top:9px">Результат</label><select class="quickStatus" data-i="'+i+'"><option value="passed">Сдал урок</option><option value="unprepared">Не подготовил урок</option><option value="absent">Отсутствует</option><option value="ill">Болен</option></select></div>'}).join("");
    var otherRows=otherEntries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+' · '+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+lessonStatus(e.lesson_status,e.attendance)+'</span></div><p>'+esc(e.lesson_date)+(e.grade?' · оценка '+e.grade:'')+'</p></div>'}).join("")||'<div class="empty">По другим предметам записей пока нет</div>';
    $("dash").innerHTML='<div class="hero"><h2>Мой журнал</h2><p>Вы редактируете свои предметы и можете посмотреть общий прогресс учеников своей группы.</p></div>'+(choices.length?'<section class="panel"><h3>Быстрая отметка всего класса</h3><p>По умолчанию все сдали. Измените только тех, кто не сдал.</p><form id="quickForm"><div class="list">'+quick+'</div><button class="btn green" style="margin-top:12px;width:100%">Сохранить отметки за сегодня</button></form></section>':'')+'<section class="panel"><h3>Подробная запись</h3>'+(choices.length?'<form id="entryForm" class="grid"><div class="full"><label>Ученик и предмет</label><select id="choice">'+opts+'</select></div><div><label>Дата</label><input id="lessonDate" type="date" required></div><div><label>Посещаемость</label><select id="att"><option value="present">На занятии</option><option value="absent">Пропуск</option><option value="ill">Болезнь</option></select></div><div><label>Оценка</label><select id="grade"><option value="">Без оценки</option><option>5</option><option>4</option><option>3</option><option>2</option></select></div><div class="full"><label>План урока</label><input id="plan" placeholder="Новая страница + повтор"></div><div class="full"><label>Что выполнено</label><input id="completed" placeholder="Фактический объём"></div><div class="full"><label>План следующего урока</label><input id="decision" placeholder="Программа покажет его на следующем уроке"></div><div class="full"><label>Комментарий</label><textarea id="comment"></textarea></div><button class="btn green full">Сохранить в общий журнал</button></form>':'<div class="empty">'+emptyMessage+'</div>')+'</section><section class="panel"><h3>Прогресс моих учеников по всем предметам</h3><div class="list">'+otherRows+'</div></section><section class="panel"><h3>Мои последние записи</h3><div class="list">'+rows+"</div></section>";
    if(choices.length){$("lessonDate").value=new Date().toISOString().slice(0,10);$("entryForm").onsubmit=saveEntry;$("quickForm").onsubmit=function(e){saveQuickClass(e,choices)}}
    await addDailyPrompt("lessons","По всем ученикам отмечено: сдал урок или нет?");
    await addDelegationPanel();
    if(profile.is_deputy)await addDeputyPanel();else await addSchedulePanel(false,true);
    if(!profile.is_deputy)await addPrintButton("Журнал успеваемости");
  }
  async function saveQuickClass(e,choices){
    e.preventDefault();var button=e.target.querySelector("button"),today=new Date().toISOString().slice(0,10);button.disabled=true;button.textContent="Сохранение…";
    try{
      var rows=Array.from(document.querySelectorAll(".quickStatus")).map(function(s){var i=Number(s.dataset.i),x=choices[i],status=s.value,plan=document.querySelector('.quickPlan[data-i="'+i+'"]').value.trim();return {lesson_date:today,teacher_id:user.id,student_id:x.student.id,subject_id:x.subject.id,attendance:status==="ill"?"ill":status==="absent"?"absent":"present",lesson_status:status,plan_text:plan,comment:status==="unprepared"?"Не подготовил урок":null}});
      await api("/rest/v1/journal_entries?on_conflict=lesson_date,teacher_id,student_id,subject_id",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify(rows)});await renderTeacher();
    }catch(err){alert(err.message);button.disabled=false;button.textContent="Сохранить отметки за сегодня"}
  }
  async function saveEntry(e){
    e.preventDefault();var ids=$("choice").value.split("|"),button=e.target.querySelector("button");button.disabled=true;button.textContent="Сохранение…";
    try{
      await api("/rest/v1/journal_entries",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify({lesson_date:$("lessonDate").value,teacher_id:user.id,student_id:ids[0],subject_id:ids[1],grade:$("grade").value?Number($("grade").value):null,attendance:$("att").value,lesson_status:$("att").value==="ill"?"ill":$("att").value==="absent"?"absent":"passed",plan_text:$("plan").value.trim(),completed_text:$("completed").value.trim(),teacher_decision:$("decision").value.trim(),comment:$("comment").value.trim()})});
      await renderTeacher();
    }catch(err){alert(err.message);button.disabled=false;button.textContent="Сохранить в общий журнал"}
  }
  async function addDelegationPanel(){
    var own=await api("/rest/v1/teacher_assignments?teacher_id=eq."+user.id+"&select=group_id,subject_id,groups(name),subjects(name)");
    own=own.filter(function(a){return (a.subjects&&a.subjects.name||"").toLowerCase().indexOf("кур")>=0});
    if(!own.length)return;
    var teachers=await api("/rest/v1/profiles?role=eq.teacher&active=eq.true&id=neq."+user.id+"&select=id,full_name&order=full_name");
    if(!teachers.length)return;
    var aopts=own.map(function(a){return '<option value="'+a.group_id+'|'+a.subject_id+'">'+esc(a.groups.name)+' · '+esc(a.subjects.name)+'</option>'}).join("");
    var topts=teachers.map(function(t){return '<option value="'+t.id+'">'+esc(t.full_name)+'</option>'}).join("");
    var s=document.createElement("section");s.className="panel";s.innerHTML='<h3>Передать группу другому учителю Куръана</h3><form id="delegateForm" class="grid"><div><label>Группа</label><select id="delegateAssignment">'+aopts+'</select></div><div><label>Учитель</label><select id="delegateTeacher">'+topts+'</select></div><div class="full"><label>Доступ до</label><input id="delegateEnd" type="date" required></div><button class="btn green full">Дать временный доступ</button></form>';$("dash").appendChild(s);$("delegateEnd").value=new Date().toISOString().slice(0,10);
    $("delegateForm").onsubmit=async function(e){e.preventDefault();var ids=$("delegateAssignment").value.split("|");try{await api("/rest/v1/teacher_delegations",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify({owner_teacher_id:user.id,substitute_teacher_id:$("delegateTeacher").value,group_id:ids[0],subject_id:ids[1],start_date:new Date().toISOString().slice(0,10),end_date:$("delegateEnd").value,active:true})});alert("Доступ учителю предоставлен") }catch(err){alert(err.message)}};
  }
  async function renderDirector(){
    var entries=await api("/rest/v1/journal_entries?select=lesson_date,grade,attendance,lesson_status,students(id,full_name),subjects(name),profiles!journal_entries_teacher_id_fkey(full_name)&order=lesson_date.desc&limit=500");
    var staff=await api("/rest/v1/profiles?select=id,full_name,role,active,is_deputy,deputy_scope,created_at&order=created_at.asc");
    var groups=await api("/rest/v1/groups?select=id,name,students(id,full_name)&active=eq.true&order=name.asc");
    var subjects=await api("/rest/v1/subjects?select=id,name&order=name.asc");
    var teacherAssignments=await api("/rest/v1/teacher_assignments?select=teacher_id,groups(name),subjects(name)");
    var allStudents=await api("/rest/v1/students?active=eq.true&select=id,full_name&order=full_name");
    var assessments=await api("/rest/v1/juz_assessments?select=assessment_date,juz_number,hifz_errors,tajwid_errors,score,decision,students(full_name)&order=assessment_date.desc&limit=50");
    var educatorNotes=await api("/rest/v1/educator_notes?select=note_date,category,note,students(full_name),profiles!educator_notes_educator_id_fkey(full_name)&order=note_date.desc&limit=50");
    var today=new Date().toISOString().slice(0,10);
    var checkins=await api("/rest/v1/daily_checkins?work_date=eq."+today+"&select=reporter_id,check_type,completed,problem_note,profiles(full_name,role)");
    var map={};entries.forEach(function(e){var s=e.students;if(!s)return;if(!map[s.id])map[s.id]={name:s.full_name,grades:[],present:0,absent:0,ill:0,passed:0,unprepared:0,lessons:0};var x=map[s.id];x.lessons++;if(e.grade)x.grades.push(Number(e.grade));x[e.attendance]++;if(e.lesson_status==="passed")x.passed++;if(e.lesson_status==="unprepared")x.unprepared++});
    var list=Object.keys(map).map(function(id){var x=map[id];x.avg=x.grades.length?x.grades.reduce(function(a,b){return a+b},0)/x.grades.length:0;x.rate=x.lessons?Math.round(x.present/x.lessons*100):0;return x}).sort(function(a,b){return b.rate-a.rate||b.avg-a.avg});
    var compare=list.map(function(x,i){return '<div class="item"><div class="row"><strong>'+(i+1)+". "+esc(x.name)+'</strong><span class="badge">'+(x.avg?x.avg.toFixed(1):"—")+'</span></div><p>Сдал: '+x.passed+" · не подготовил: "+x.unprepared+" · пропусков: "+x.absent+" · болезней: "+x.ill+"</p></div>"}).join("")||'<div class="empty">После первых записей учителей здесь появится сравнение</div>';
    var studentOptions=allStudents.map(function(s){return '<option value="'+s.id+'">'+esc(s.full_name)+'</option>'}).join("");
    var assessmentRows=assessments.map(function(a){return '<div class="item"><div class="row"><strong>'+esc(a.students&&a.students.full_name)+' · '+a.juz_number+' джуз</strong><span class="badge">'+a.score+' баллов</span></div><p>Хифз: '+a.hifz_errors+' · таджвид: '+a.tajwid_errors+' · '+esc(a.decision||'')+'</p></div>'}).join("")||'<div class="empty">Контрольных сдач пока нет</div>';
    var educatorRows=educatorNotes.map(function(n){return '<div class="item"><strong>'+esc(n.students&&n.students.full_name)+' · '+esc(n.category)+'</strong><p>'+esc(n.note)+' · '+esc(n.note_date)+' · '+esc(n.profiles&&n.profiles.full_name)+'</p></div>'}).join("")||'<div class="empty">Записей воспитателя пока нет</div>';
    var assignees=staff.filter(function(p){return p.role!=="director"&&p.active}).map(function(p){return '<option value="'+p.id+'">'+esc(p.full_name)+" · "+staffLabel(p,teacherAssignments)+"</option>"}).join("");
    var pending=staff.filter(function(p){return !p.active}).map(function(p){return '<div class="item"><strong>'+esc(p.full_name)+'</strong><div class="grid" style="margin-top:9px"><select data-role="'+p.id+'"><option value="teacher">Учитель</option><option value="educator">Воспитатель</option><option value="deputy">Заместитель по учебной части</option><option value="admin">Администратор</option><option value="cleaner">Уборщик</option></select><button class="btn green" data-approve="'+p.id+'">Подтвердить</button></div></div>'}).join("")||'<div class="empty">Новых регистраций нет</div>';
    var deputyControls=staff.filter(function(p){return p.active&&p.role!=="director"}).map(function(p){var s=p.deputy_scope||'none';return '<div class="item"><strong>'+esc(p.full_name)+'</strong><p>'+roleName(p.role)+'</p><div class="grid" style="margin-top:9px"><button class="btn '+(s==='religious'||s==='both'?'':'green')+'" data-deputy-scope="religious" data-current="'+s+'" data-id="'+p.id+'">Религиозные науки</button><button class="btn '+(s==='secular'||s==='both'?'':'green')+'" data-deputy-scope="secular" data-current="'+s+'" data-id="'+p.id+'">Светские науки</button></div></div>'}).join("")||'<div class="empty">Сотрудников пока нет</div>';
    var teachers=staff.filter(function(p){return p.role==="teacher"&&p.active});
    var groupOptions=groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>'}).join("");
    var subjectOptions=subjects.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join("");
    var teacherOptions=teachers.map(function(t){return '<option value="'+t.id+'">'+esc(t.full_name)+'</option>'}).join("");
    var assignmentList=teacherAssignments.map(function(a){var t=staff.find(function(p){return p.id===a.teacher_id});return '<div class="item"><strong>'+esc(t&&t.full_name)+'</strong><p>'+esc(a.subjects&&a.subjects.name)+" · "+esc(a.groups&&a.groups.name)+"</p></div>"}).join("")||'<div class="empty">Назначений пока нет</div>';
    var daily=checkins.map(function(c){return '<div class="item"><div class="row"><strong>'+esc(c.profiles&&c.profiles.full_name)+'</strong><span class="badge '+(c.completed?"":"todo")+'">'+(c.completed?"Выполнено":"Есть проблема")+'</span></div><p>'+labelCheck(c.check_type)+(c.problem_note?" · "+esc(c.problem_note):"")+"</p></div>"}).join("")||'<div class="empty">Сегодня сотрудники ещё не закрывали рабочий день</div>';
    $("dash").innerHTML='<div class="hero"><h2>Успеваемость центра</h2><p>Директор контролирует сотрудников и принимает подготовленный джуз.</p></div><div class="stats"><div class="stat"><strong>'+list.length+'</strong><span>учеников с записями</span></div><div class="stat"><strong>'+entries.length+'</strong><span>уроков в журнале</span></div></div><section class="panel"><h3>Контрольная сдача джуза</h3>'+(studentOptions?'<form id="assessmentForm" class="grid"><div class="full"><label>Ученик</label><select id="assessmentStudent">'+studentOptions+'</select></div><div><label>Номер джуза</label><input id="assessmentJuz" type="number" min="1" max="30" required></div><div><label>Ошибки по хифзу (−3)</label><input id="hifzErrors" type="number" min="0" value="0"></div><div><label>Ошибки по таджвиду (−1,5)</label><input id="tajwidErrors" type="number" min="0" value="0"></div><div><label>Решение</label><select id="assessmentDecision"><option>Готов к сдаче</option><option>Исправить и повторить</option><option>Пока не готов</option></select></div><button class="btn green full">Рассчитать и сохранить</button></form>':'<div class="empty">Заместителю нужно добавить учеников</div>')+'<div class="list" style="margin-top:12px">'+assessmentRows+'</div></section><section class="panel"><h3>Новые сотрудники</h3><div class="list">'+pending+'</div></section><section class="panel"><h3>Заместитель по учебной части</h3><div class="list">'+deputyControls+'</div></section><section class="panel"><h3>Предметы учителей</h3>'+(teachers.length&&groups.length?'<form id="assignmentForm" class="grid"><div><label>Учитель</label><select id="assignTeacher">'+teacherOptions+'</select></div><div><label>Группа</label><select id="assignGroup">'+groupOptions+'</select></div><div><label>Предмет</label><select id="assignSubject">'+subjectOptions+'</select></div><button class="btn green">Назначить</button></form>':'<div class="empty">Заместителю нужно создать группу, затем здесь можно назначить предмет</div>')+'<div class="list" style="margin-top:12px">'+assignmentList+'</div></section><section class="panel"><h3>Итог сегодняшнего дня</h3><div class="list">'+daily+'</div></section><section class="panel"><h3>Сравнение учеников</h3><div class="list">'+compare+'</div></section><section class="panel"><h3>Поставить задачу</h3>'+(assignees?'<form id="taskForm" class="grid"><div><label>Исполнитель</label><select id="assignee">'+assignees+'</select></div><div><label>Срок</label><input id="due" type="date"></div><div class="full"><label>Название</label><input id="taskTitle" required></div><div class="full"><label>Описание</label><textarea id="taskDescription"></textarea></div><button class="btn green full">Назначить</button></form>':'<div class="empty">Сначала добавьте сотрудников</div>')+"</section>";
    $("dash").insertAdjacentHTML("beforeend",'<section class="panel"><h3>Добавить сотрудника</h3><form id="createStaffForm" class="grid"><div class="full"><label>Имя и фамилия</label><input id="newStaffName" required></div><div><label>Должность</label><select id="newStaffRole"><option value="teacher">Учитель</option><option value="educator">Воспитатель</option><option value="admin">Администратор</option><option value="cleaner">Уборщик</option></select></div><div><label>Логин латиницей</label><input id="newStaffLogin" placeholder="ibrahim" pattern="[A-Za-z0-9._-]+" required></div><div class="full"><label>Начальный пароль</label><input id="newStaffPassword" type="password" minlength="6" required></div><button class="btn green full">Создать сотрудника</button></form></section>');
    $("dash").insertAdjacentHTML("beforeend",'<section class="panel"><h3>Записи воспитателя</h3><div class="list">'+educatorRows+'</div></section>');
    if(assignees)$("taskForm").onsubmit=saveTask;
    $("createStaffForm").onsubmit=createStaff;
    if(studentOptions)$("assessmentForm").onsubmit=saveAssessment;
    if(teachers.length&&groups.length)$("assignmentForm").onsubmit=saveAssignment;
    document.querySelectorAll("[data-deputy-scope]").forEach(function(b){b.onclick=async function(){b.disabled=true;var cur=b.dataset.current,want=b.dataset.deputyScope,next;if(cur==='both')next=want==='religious'?'secular':'religious';else if(cur===want)next='none';else if(cur==='none'||!cur)next=want;else next='both';try{await api("/rest/v1/profiles?id=eq."+b.dataset.id,{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({deputy_scope:next,is_deputy:next!=='none'})});await renderDirector()}catch(err){alert(err.message);b.disabled=false}}});
    document.querySelectorAll("[data-approve]").forEach(function(b){b.onclick=async function(){var id=b.dataset.approve,sel=document.querySelector('[data-role="'+id+'"]');b.disabled=true;try{await api("/rest/v1/rpc/approve_staff",{method:"POST",body:JSON.stringify({p_user:id,p_role:sel.value,p_name:b.closest(".item").querySelector("strong").textContent})});await renderDirector()}catch(err){alert(err.message);b.disabled=false}}});
    await addSchedulePanel(false,false);
  }
  async function createStaff(e){
    e.preventDefault();var name=$("newStaffName").value.trim(),loginName=$("newStaffLogin").value.trim().toLowerCase(),password=$("newStaffPassword").value,role=$("newStaffRole").value,email=loginName+"@akyl-center.app",button=e.target.querySelector("button");button.disabled=true;button.textContent="Создание…";
    try{
      var res=await fetch(URL+"/auth/v1/signup",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify({email:email,password:password,data:{full_name:name}})}),data=await res.json();
      if(!res.ok||!data.user)throw new Error(data.msg||data.message||"Не удалось создать сотрудника");
      await api("/rest/v1/rpc/approve_staff",{method:"POST",body:JSON.stringify({p_user:data.user.id,p_role:role,p_name:name})});
      await api("/rest/v1/profiles?id=eq."+data.user.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({login_name:loginName})});
      alert("Сотрудник создан. Логин: "+loginName);await renderDirector();
    }catch(err){alert(err.message);button.disabled=false;button.textContent="Создать сотрудника"}
  }
  async function saveAssessment(e){e.preventDefault();var h=Number($("hifzErrors").value||0),t=Number($("tajwidErrors").value||0),score=Math.max(0,100-h*3-t*1.5);try{await api("/rest/v1/juz_assessments",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({student_id:$("assessmentStudent").value,juz_number:Number($("assessmentJuz").value),examiner_id:user.id,hifz_errors:h,tajwid_errors:t,score:score,decision:$("assessmentDecision").value})});alert("Итог: "+score+" баллов");await renderDirector()}catch(err){alert(err.message)}}
  async function renderDeputy(){
    $("dash").innerHTML='<div class="hero"><h2>Учебная часть</h2><p>Группы, ученики и все учебные журналы.</p></div>';
    await addDeputyPanel();
  }
  async function addDeputyPanel(){
    var entries=await api("/rest/v1/journal_entries?select=lesson_date,grade,attendance,lesson_status,students(full_name),subjects(name),profiles!journal_entries_teacher_id_fkey(full_name)&order=lesson_date.desc&limit=500");
    var groups=await api("/rest/v1/groups?select=id,name,students(id,full_name)&active=eq.true&order=name.asc");
    var groupOptions=groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>'}).join("");
    var students=groups.map(function(g){return '<div class="item"><strong>'+esc(g.name)+'</strong><p>'+((g.students||[]).map(function(s){return esc(s.full_name)}).join(', ')||'Учеников пока нет')+'</p></div>'}).join("")||'<div class="empty">Групп пока нет</div>';
    var rows=entries.map(function(e){return '<div class="item"><div class="row"><strong>'+esc(e.students&&e.students.full_name)+' · '+esc(e.subjects&&e.subjects.name)+'</strong><span class="badge">'+lessonStatus(e.lesson_status,e.attendance)+'</span></div><p>'+esc(e.lesson_date)+' · учитель: '+esc(e.profiles&&e.profiles.full_name)+(e.grade?' · оценка '+e.grade:'')+'</p></div>'}).join("")||'<div class="empty">Записей пока нет</div>';
    $("dash").insertAdjacentHTML('beforeend','<section class="panel"><h3>Группы и ученики</h3><form id="groupForm" class="grid"><div><label>Новая группа</label><input id="groupName" placeholder="Например: Хазырлык" required></div><button class="btn green">Добавить группу</button></form>'+(groups.length?'<form id="studentForm" class="grid" style="margin-top:12px"><div><label>Имя ученика</label><input id="studentName" required></div><div><label>Группа</label><select id="studentGroup">'+groupOptions+'</select></div><button class="btn green full">Добавить ученика</button></form>':'<div class="empty">Сначала создайте группу</div>')+'<div class="list" style="margin-top:12px">'+students+'</div></section><section class="panel"><h3>Общий журнал по всем предметам</h3><div class="list">'+rows+'</div></section>');
    $("groupForm").onsubmit=saveGroup;if(groups.length)$("studentForm").onsubmit=saveStudent;
    await addSchedulePanel(true,false);
    await addDutyPanel("class",true);
  }
  async function addSchedulePanel(canEdit,onlyMine){
    var query="/rest/v1/schedule_entries?select=id,weekday,lesson_time,groups(name),subjects(name),profiles!schedule_entries_teacher_id_fkey(full_name)&order=weekday.asc,lesson_time.asc";
    if(onlyMine)query+="&teacher_id=eq."+user.id;
    var rows=await api(query),days=["","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
    var list=rows.map(function(x){return '<div class="item"><div class="row"><strong>'+days[x.weekday]+' · '+String(x.lesson_time).slice(0,5)+'</strong><span class="badge">'+esc(x.subjects&&x.subjects.name)+'</span></div><p>'+esc(x.groups&&x.groups.name)+' · '+esc(x.profiles&&x.profiles.full_name)+'</p></div>'}).join("")||'<div class="empty">Расписание пока не заполнено</div>';
    var form="";
    if(canEdit){var groups=await api("/rest/v1/groups?active=eq.true&select=id,name&order=name"),subjects=await api("/rest/v1/subjects?select=id,name&order=name"),teachers=await api("/rest/v1/profiles?role=eq.teacher&active=eq.true&select=id,full_name&order=full_name");form='<form id="scheduleForm" class="grid"><div><label>День</label><select id="scheduleDay">'+days.slice(1).map(function(d,i){return '<option value="'+(i+1)+'">'+d+'</option>'}).join('')+'</select></div><div><label>Время</label><input id="scheduleTime" type="time" required></div><div><label>Группа</label><select id="scheduleGroup">'+groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>'}).join('')+'</select></div><div><label>Предмет</label><select id="scheduleSubject">'+subjects.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join('')+'</select></div><div class="full"><label>Учитель</label><select id="scheduleTeacher">'+teachers.map(function(t){return '<option value="'+t.id+'">'+esc(t.full_name)+'</option>'}).join('')+'</select></div><button class="btn green full">Добавить в расписание</button></form>'}
    var section=document.createElement("section");section.className="panel";section.innerHTML='<h3>Расписание</h3>'+form+'<div class="list" style="margin-top:12px">'+list+'</div>';$("dash").appendChild(section);
    if(canEdit&&$("scheduleForm"))$("scheduleForm").onsubmit=async function(e){e.preventDefault();try{await api("/rest/v1/schedule_entries",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({weekday:Number($("scheduleDay").value),lesson_time:$("scheduleTime").value,group_id:$("scheduleGroup").value,subject_id:$("scheduleSubject").value,teacher_id:$("scheduleTeacher").value})});await render()}catch(err){alert(err.message)}};
  }
  async function saveTask(e){
    e.preventDefault();try{await api("/rest/v1/tasks",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({created_by:user.id,assigned_to:$("assignee").value,title:$("taskTitle").value.trim(),description:$("taskDescription").value.trim(),due_date:$("due").value||null})});alert("Задача назначена");await renderDirector()}catch(err){alert(err.message)}
  }
  async function saveGroup(e){
    e.preventDefault();try{await api("/rest/v1/groups",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({name:$("groupName").value.trim()})});await render()}catch(err){alert(err.message)}
  }
  async function saveStudent(e){
    e.preventDefault();try{await api("/rest/v1/students",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({full_name:$("studentName").value.trim(),group_id:$("studentGroup").value})});await render()}catch(err){alert(err.message)}
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
  async function renderEducator(){
    var students=await api("/rest/v1/students?active=eq.true&select=id,full_name&order=full_name"),notes=await api("/rest/v1/educator_notes?educator_id=eq."+user.id+"&select=note_date,category,note,students(full_name)&order=note_date.desc&limit=60");
    var opts=students.map(function(s){return '<option value="'+s.id+'">'+esc(s.full_name)+'</option>'}).join(''),rows=notes.map(function(n){return '<div class="item"><strong>'+esc(n.students&&n.students.full_name)+' · '+esc(n.category)+'</strong><p>'+esc(n.note)+' · '+esc(n.note_date)+'</p></div>'}).join('')||'<div class="empty">Записей пока нет</div>';
    $("dash").innerHTML='<div class="hero"><h2>Журнал воспитателя</h2><p>Короткие наблюдения по поведению, дисциплине и состоянию учеников.</p></div><section class="panel"><h3>Новая запись</h3>'+(opts?'<form id="educatorForm" class="grid"><div><label>Ученик</label><select id="educatorStudent">'+opts+'</select></div><div><label>Раздел</label><select id="educatorCategory"><option>Поведение</option><option>Дисциплина</option><option>Здоровье</option><option>Другое</option></select></div><div class="full"><label>Наблюдение</label><textarea id="educatorNote" required></textarea></div><button class="btn green full">Сохранить</button></form>':'<div class="empty">Заместитель ещё не добавил учеников</div>')+'</section><section class="panel"><h3>Мои записи</h3><div class="list">'+rows+'</div></section>';
    if(opts)$("educatorForm").onsubmit=async function(e){e.preventDefault();try{await api("/rest/v1/educator_notes",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({educator_id:user.id,student_id:$("educatorStudent").value,category:$("educatorCategory").value,note:$("educatorNote").value.trim()})});await renderEducator()}catch(err){alert(err.message)}};
    await addDutyPanel("dining",true);
  }
  async function addDutyPanel(type,canEdit){
    var title=type==="class"?"Дежурные по классам":"Дежурные по столовой",today=new Date().toISOString().slice(0,10);
    var groups=await api("/rest/v1/groups?active=eq.true&select=id,name&order=name"),students=await api("/rest/v1/students?active=eq.true&select=id,full_name,group_id&order=full_name"),duties=await api("/rest/v1/duty_assignments?duty_type=eq."+type+"&select=id,duty_date,status,rating,student_id,students(full_name),groups(name)&order=duty_date.desc&limit=80"),penalties=await api("/rest/v1/duty_penalties?duty_type=eq."+type+"&active=eq.true&select=id,start_date,end_date,reason,students(full_name)&order=end_date.desc");
    var groupField=type==="class"?'<div><label>Группа</label><select id="dutyGroup">'+groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>'}).join('')+'</select></div>':'';
    var rows=duties.map(function(d){return '<div class="item"><div class="row"><strong>'+esc(d.students&&d.students.full_name)+' · '+esc(d.groups&&d.groups.name||title)+'</strong><span class="badge">'+dutyStatus(d.status)+'</span></div><p>'+esc(d.duty_date)+(d.rating?' · оценка: '+esc(d.rating):'')+'</p>'+(canEdit&&d.duty_date===today&&d.status==='assigned'?'<div class="grid" style="margin-top:9px"><select data-duty-rating="'+d.id+'"><option value="excellent">Отлично</option><option value="good">Хорошо</option><option value="redo">Нужно исправить</option><option value="failed">Не выполнено</option><option value="absent">Отсутствовал</option></select><button class="btn green" data-duty-save="'+d.id+'">Сохранить</button></div>':'')+'</div>'}).join('')||'<div class="empty">Назначений пока нет</div>';
    var penaltyRows=penalties.map(function(p){return '<div class="item"><strong>'+esc(p.students&&p.students.full_name)+'</strong><p>'+esc(p.start_date)+' — '+esc(p.end_date)+' · '+esc(p.reason)+'</p></div>'}).join('')||'<div class="empty">Дополнительных дежурств нет</div>';
    var form=canEdit?'<form id="randomDutyForm" class="grid">'+groupField+'<div><label>Дата</label><input id="dutyDate" type="date" value="'+today+'" required></div><button class="btn green full">Назначить случайно</button></form><form id="penaltyForm" class="grid" style="margin-top:12px"><div><label>Ученик</label><select id="penaltyStudent">'+students.map(function(s){return '<option value="'+s.id+'">'+esc(s.full_name)+'</option>'}).join('')+'</select></div><div><label>Срок</label><select id="penaltyDays"><option value="7">Неделя</option><option value="30">Месяц</option></select></div><div class="full"><label>Причина</label><input id="penaltyReason" required></div><button class="btn full">Назначить дополнительное дежурство</button></form>':'';
    var s=document.createElement("section");s.className="panel";s.innerHTML='<h3>'+title+'</h3>'+form+'<div class="list" style="margin-top:12px">'+rows+'</div><h3 style="margin-top:16px">Дополнительные дежурства</h3><div class="list">'+penaltyRows+'</div>';$("dash").appendChild(s);
    if(canEdit){$("randomDutyForm").onsubmit=async function(e){e.preventDefault();try{await api("/rest/v1/rpc/assign_random_duty",{method:"POST",body:JSON.stringify({p_duty_type:type,p_group_id:type==="class"?$("dutyGroup").value:null,p_duty_date:$("dutyDate").value,p_exclude_student:null})});await render()}catch(err){alert(err.message)}};$("penaltyForm").onsubmit=async function(e){e.preventDefault();var start=new Date(),end=new Date();end.setDate(end.getDate()+Number($("penaltyDays").value)-1);try{await api("/rest/v1/duty_penalties",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({student_id:$("penaltyStudent").value,duty_type:type,start_date:start.toISOString().slice(0,10),end_date:end.toISOString().slice(0,10),reason:$("penaltyReason").value.trim(),assigned_by:user.id,active:true})});await render()}catch(err){alert(err.message)}};document.querySelectorAll("[data-duty-save]").forEach(function(b){b.onclick=async function(){var id=b.dataset.dutySave,r=document.querySelector('[data-duty-rating="'+id+'"]').value,status=r==='absent'?'absent':r==='redo'||r==='failed'?'redo':'completed';try{await api("/rest/v1/duty_assignments?id=eq."+id,{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify({status:status,rating:r})});if(r==='absent'){var d=duties.find(function(x){return x.id===id}),tom=new Date();tom.setDate(tom.getDate()+1);await api("/rest/v1/duty_assignments",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({duty_date:tom.toISOString().slice(0,10),duty_type:type,group_id:type==="class"&&d.groups?groups.find(function(g){return g.name===d.groups.name}).id:null,student_id:d.student_id,assigned_by:user.id,status:'assigned'})});await api("/rest/v1/rpc/assign_random_duty",{method:"POST",body:JSON.stringify({p_duty_type:type,p_group_id:type==="class"&&d.groups?groups.find(function(g){return g.name===d.groups.name}).id:null,p_duty_date:today,p_exclude_student:d.student_id})})}else if(status==='redo'){var dd=duties.find(function(x){return x.id===id}),next=new Date();next.setDate(next.getDate()+1);await api("/rest/v1/duty_assignments",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({duty_date:next.toISOString().slice(0,10),duty_type:type,group_id:type==="class"&&dd.groups?groups.find(function(g){return g.name===dd.groups.name}).id:null,student_id:dd.student_id,assigned_by:user.id,status:'assigned'})})}await render()}catch(err){alert(err.message)}}})}
  }
  function dutyStatus(x){return {assigned:"назначен",completed:"выполнено",absent:"отсутствовал",redo:"повторить"}[x]||x}
  async function addPrintButton(title){var b=document.createElement("button");b.className="btn green";b.style.cssText="width:100%;margin-top:12px";b.textContent="Печать / сохранить PDF: "+title;b.onclick=function(){window.print()};$("dash").appendChild(b)}
  async function addDailyPrompt(type,question){
    var today=new Date().toISOString().slice(0,10),rows=await api("/rest/v1/daily_checkins?reporter_id=eq."+user.id+"&work_date=eq."+today+"&check_type=eq."+type+"&select=id,completed,problem_note"),old=rows[0];
    var section=document.createElement("section");section.className="panel";
    section.innerHTML='<h3>'+esc(question)+'</h3>'+(old?'<div class="item"><div class="row"><strong>Ответ за сегодня сохранён</strong><span class="badge '+(old.completed?"":"todo")+'">'+(old.completed?"Да":"Нет")+'</span></div><p>'+(old.problem_note?esc(old.problem_note):"Комментарий не требовался")+'</p></div>':'<form id="dailyForm" class="grid"><div class="full"><label>Ответ</label><select id="dailyCompleted"><option value="true">Да, выполнено</option><option value="false">Нет, есть проблема</option></select></div><div class="full"><label>Комментарий — только если не выполнено</label><textarea id="dailyNote" placeholder="Коротко укажите причину"></textarea></div><button class="btn green full">Закрыть рабочий день</button></form>');
    $("dash").appendChild(section);
    if(!old){$("dailyForm").onsubmit=async function(e){e.preventDefault();var completed=$("dailyCompleted").value==="true",note=$("dailyNote").value.trim();if(!completed&&!note){alert("При ответе «нет» коротко укажите причину");return}await api("/rest/v1/daily_checkins",{method:"POST",headers:{"Prefer":"return=minimal,resolution=merge-duplicates"},body:JSON.stringify({work_date:today,reporter_id:user.id,check_type:type,completed:completed,problem_note:note||null})});await render()}}
  }
  function labelCheck(x){return {lessons:"Ученики отмечены",cleaning:"Уборка",admin_tasks:"Задачи администратора"}[x]||x}
  function roleName(x){return {teacher:"учитель",educator:"воспитатель",deputy:"заместитель по учебной части",admin:"администратор",cleaner:"уборщик"}[x]||x}
  function staffLabel(p,a){if(p.role!=="teacher")return roleName(p.role);var own=a.filter(function(x){return x.teacher_id===p.id});if(!own.length)return "учитель · предмет не назначен";return own.map(function(x){return "учитель "+(x.subjects&&x.subjects.name)+" · "+(x.groups&&x.groups.name)}).join(", ")}
  function attendance(x){return {present:"на занятии",absent:"пропуск",ill:"болезнь"}[x]||x}
  function lessonStatus(x,a){return {passed:"сдал",unprepared:"не подготовил",absent:"отсутствует",ill:"болен"}[x]||attendance(a)}
  function makeSectionsMenu(){
    var dash=$("dash"),stats=dash.querySelector(":scope > .stats");
    if(stats){var summary=document.createElement("section"),summaryTitle=document.createElement("h3");summary.className="panel";summaryTitle.textContent="Краткий итог";stats.parentNode.insertBefore(summary,stats);summary.appendChild(summaryTitle);summary.appendChild(stats)}
    var panels=Array.from(dash.querySelectorAll(":scope > .panel"));
    if(!panels.length)return;
    var hint=document.createElement("div");hint.className="section-hint";hint.textContent="Выберите нужный раздел";
    var anchor=dash.querySelector(":scope > .hero, :scope > .stats");
    if(anchor)anchor.insertAdjacentElement("afterend",hint);else dash.insertBefore(hint,dash.firstChild);
    var priority={"Расписание":1,"Уведомления":2,"Поставить задачу":3,"Контрольная сдача джуза":4,"Краткий итог":5,"Итог сегодняшнего дня":6,"Сравнение учеников":7,"Предметы учителей":8,"Заместитель по учебной части":9,"Добавить сотрудника":10,"Новые сотрудники":11,"Записи воспитателя":12};
    panels.sort(function(a,b){var ah=a.querySelector(":scope > h3"),bh=b.querySelector(":scope > h3"),ap=priority[ah&&ah.textContent.trim()]||50,bp=priority[bh&&bh.textContent.trim()]||50;return ap-bp}).forEach(function(panel){dash.appendChild(panel)});
    panels.forEach(function(panel,index){
      if(panel.classList.contains("section-card"))return;
      var heading=panel.querySelector(":scope > h3"),title=heading?heading.textContent.trim():"Раздел "+(index+1);
      var body=document.createElement("div");body.className="section-body";
      Array.from(panel.childNodes).forEach(function(node){if(node!==heading)body.appendChild(node)});
      var button=document.createElement("button");button.type="button";button.className="section-toggle";button.setAttribute("aria-expanded","false");button.innerHTML='<span>'+esc(title)+'</span><span class="section-arrow">⌄</span>';
      if(heading)heading.remove();panel.appendChild(button);panel.appendChild(body);panel.classList.add("section-card","closed");
      button.onclick=function(){var closed=panel.classList.toggle("closed");button.setAttribute("aria-expanded",String(!closed));button.querySelector(".section-arrow").textContent=closed?"⌄":"⌃";if(!closed)setTimeout(function(){panel.scrollIntoView({behavior:"smooth",block:"start"})},50)};
    });
    setupDashboardNavigation(panels,hint);
  }
  function setupDashboardNavigation(panels,hint){
    function category(title){
      if(/Досье|воспитател|Дежур|ученик/i.test(title)&&!/Сравнение/i.test(title))return "students";
      if(/журнал|запис|сдач|успеваем|Сравнение|Итог сегодняшнего дня|Новая запись/i.test(title))return "journal";
      if(/Проекты|сбор/i.test(title))return "projects";
      if(/Безопасность|сотрудник|Заместитель|Предметы учителей|Добавить|Новые сотрудники/i.test(title))return "more";
      return "home";
    }
    panels.forEach(function(panel){var b=panel.querySelector(".section-toggle"),title=b?b.textContent.trim():"";panel.dataset.navCategory=category(title)});
    var nav=document.createElement("nav");nav.className="dashboard-nav";nav.innerHTML='<button class="nav-button active" data-nav="home"><span>⌂</span>Главная</button><button class="nav-button" data-nav="journal"><span>▤</span>Журнал</button><button class="nav-button" data-nav="students"><span>♙</span>Ученики</button><button class="nav-button" data-nav="projects"><span>◆</span>Проекты</button><button class="nav-button" data-nav="more"><span>•••</span>Ещё</button>';document.body.appendChild(nav);
    function show(name){activeNav=name;panels.forEach(function(panel){panel.classList.toggle("nav-hidden",panel.dataset.navCategory!==name)});nav.querySelectorAll(".nav-button").forEach(function(b){b.classList.toggle("active",b.dataset.nav===name)});hint.textContent={home:"Главная",journal:"Журнал и успеваемость",students:"Ученики",projects:"Проекты центра",more:"Управление"}[name];window.scrollTo({top:0,behavior:"smooth"})}
    nav.querySelectorAll(".nav-button").forEach(function(b){b.onclick=function(){show(b.dataset.nav)}});show(activeNav||"home");
  }
  var pullStart=0,pullReady=false;
  document.addEventListener("touchstart",function(e){if(window.scrollY===0&&profile){pullStart=e.touches[0].clientY;pullReady=false}}, {passive:true});
  document.addEventListener("touchmove",function(e){if(!pullStart)return;var distance=e.touches[0].clientY-pullStart;if(distance>85){pullReady=true;var d=$("pullRefresh");if(!d){d=document.createElement("div");d.id="pullRefresh";d.className="empty";d.style.cssText="position:fixed;top:8px;left:25%;width:50%;z-index:20;background:#fff;border-radius:20px;box-shadow:0 4px 18px #0002";document.body.appendChild(d)}d.textContent="Отпустите, чтобы обновить"}}, {passive:true});
  document.addEventListener("touchend",async function(){var d=$("pullRefresh");if(d)d.remove();var ready=pullReady;pullStart=0;pullReady=false;if(ready&&profile){$("dash").innerHTML='<div class="empty">Обновление…</div>';try{await render()}catch(err){alert(err.message)}}}, {passive:true});
  try{var saved=JSON.parse(localStorage.getItem("akyl_auth")||"null");if(saved&&saved.user){token=saved.token||"";refreshToken=saved.refreshToken||"";user=saved.user;loadProfile().catch(async function(){try{await refreshSession();await loadProfile()}catch(err){localStorage.removeItem("akyl_auth");showLogin("Войдите снова.");await loadLoginDirectory()}})}else loadLoginDirectory()}catch(e){loadLoginDirectory()}
})();
