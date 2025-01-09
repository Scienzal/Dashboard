window.addEventListener('load', function () {
    console.log('On load! :D');
});

dayjs.extend(dayjs_plugin_relativeTime);

if (window.location.pathname == '/') loadUser();
if (window.location.pathname == '/profile') loadProfile();
if (window.location.pathname == '/tickets') loadTickets();
if (String(window.location.pathname).startsWith('/tickets/view')) loadTicketMessages();
if (window.location.pathname == '/billing') loadDeposits();

function get(key) {
    var el = document.getElementById(key);
    if (!el) return console.log(`el ${key} not found!`);

    return el.value;
}
function set(key, val) {
    var el = document.getElementById(key);
    if (!el) return console.log(`el ${key} not found!`);

    el.innerHTML = val;
}
function setVal(key, val) {
    var el = document.getElementById(key);
    if (!el) return console.log(`el ${key} not found!`);

    el.value = val;
}

function error(msg) {
    var el = document.getElementById('error');
    var box = document.getElementById('errorbox');
    if (!el || !box) return;

    el.innerText = `Error: ${msg}`;
    box.style.display = 'block';
}
function ok(msg) {
    var el = document.getElementById('ok');
    var box = document.getElementById('okbox');
    if (!el || !box) return;

    el.innerText = msg;
    box.style.display = 'block';
}

async function login() {
    var email = get('email');
    var password = get('password');

    try {
        var res = await superagent
            .post('/api/auth/login')
            .send({ email, password }) // sends a JSON post body
            .set('accept', 'json');
        res = res.body;

        window.location.href = '/';
    } catch (e) {
        var err = JSON.parse(e.message).error;
        error(err);
    }
}

async function register() {
    var email = get('email');
    var password = get('password');

    var firstName = get('firstname');
    var lastName = get('lastname');

    var country = get('country');
    var address = get('address');
    var phone = get('phone');

    try {
        var res = await superagent
            .post('/api/auth/register')
            .send({
                email,
                password,

                firstName,
                lastName,

                country,
                address,
                phoneNumber: phone
            }) // sends a JSON post body
            .set('accept', 'json');
        res = res.body;

        window.location.href = '/';
    } catch (e) {
        var err = JSON.parse(e.message).error;
        error(err);
    }
}

async function sendVerifyMail() {
    var res = await superagent
            .get('/api/sendverifymail')
            .set('accept', 'json');
        res = res.body;

    ok(`Mail sent! Please check your email.`);
    setTimeout(() => {
        window.location.href = '/verify';
    }, 5000);
}

async function sendVerifyToken() {
    var key = get('key');
    try {
    var res = await superagent
            .get('/api/verifyuser?key=' + key)
            .set('accept', 'json');
        res = res.body;

        ok(`Account verified!`);

        setTimeout(() => {
            window.location.href = '/';
        }, 5000);
    } catch(e) {
        var err = JSON.parse(e.message).error;
        error(err);
    }
}

async function loadUser() {
    var res = await superagent
            .get('/api/userinfo')
            .set('accept', 'json');
        res = res.body;

    console.log('res', res);

    set('name', `${res.firstName} ${res.lastName}`);
    set('balance', `${res.credits} credits (€${(res.credits/1_000_000).toFixed(3)})`);

    //  Verify disabled until mail setup is complete
    /* if (res.isVerified == false) {
        if (res.verifyMailSent == false) {
            error(`You are not verified. Click <button onclick="sendVerifyMail();" class="btn">here</button> to send the verify email.`);
        } else {
            error(`You are not verified. Click <a href="/verify" class="btn">here</a> to enter the code you received via email. If you didn't receive an email, please create a ticket at the support page.`);
        }
    } */

    var res2 = await superagent
            .get('/api/tickets/open');
        res2 = res2.text;

    console.log('res', res2);

    set('tickets', res2);
}

async function updateUser() {
    var email = get('email');
    var password = get('password');

    var firstName = get('firstname');
    var lastName = get('lastname');

    var country = get('country');
    var address = get('address');
    var phone = get('phone');

    try {
        var res = await superagent
            .post('/api/updatedetails')
            .send({
                email,
                password,

                firstName,
                lastName,

                country,
                address,
                phoneNumber: phone
            }) // sends a JSON post body
            .set('accept', 'json');
        res = res.body;
        
        ok('Profile updated!');
    } catch (e) {
        var err = JSON.parse(e.message).error;
        error(err);
    }
}

async function loadProfile() {
    var res = await superagent
            .get('/api/userinfo')
            .set('accept', 'json');
        res = res.body;

    console.log('res', res);

    setVal('firstname', res.firstName);
    setVal('lastname', res.lastName);
    setVal('country', res.country);
    setVal('address', res.address);
    setVal('phone', res.phoneNumber);
}
async function loadTickets() {
    /* Open ticket count */
    var res2 = await superagent
            .get('/api/tickets/open');
        res2 = res2.text;
    set('ticketCount', res2);

    /* Ticket list */
    var res = await superagent
            .get('/api/tickets')
            .set('accept', 'json');
        res = res.body;

    console.log('res', res);

    var ticketHTML = ``;

    for (let i = 0; i < res.length; i++) {
        var ticket = res[i];

        ticketHTML += `<tr>
                  <td>${ticket.ticketID}</td>
                  <td>${ticket.subject}</td>
                  <td>${ticket.status}</td>
                  <td>${dayjs().to(dayjs(ticket.lastAction))}</td>
                  <td><a href="/tickets/view/${ticket.ticketID}">[VIEW]</a></td>
                </tr>`;
    }

    set('tickets', ticketHTML);
}

async function createTicket() {
    var subject = get('subject');
    var msg = get('message');

    try {
        var res = await superagent
            .post('/api/ticket/new')
            .send({ subject, msg }) // sends a JSON post body
            .set('accept', 'json');
        res = res.body;

        window.location.href = `/tickets/view/${res.ticketID}`;
    } catch (e) {
        var err = JSON.parse(e.message).error;
        error(err);
    }
}

async function loadTicketMessages() {
    var res = await superagent
            .get(`/api/ticket/${id}`).set('accept', 'json');;
        res = res.body;
    set('lastAction', dayjs().to(dayjs(res.ticket.lastAction)));
    set('status', res.ticket.status);
    set('ticketID', res.ticket.ticketID);
    set('subject', res.ticket.subject);

    if (res.ticket.status == 'closed') {
        set('postform', '<i>You cannot reply to closed tickets.</i>');
        document.getElementById('closebtn').classList.add('disabled');
        document.getElementById('closebtn').classList.add('btn-danger');
        document.getElementById('closebtn').classList.remove('btn-primary');
        document.getElementById('closebtn').innerHTML = `Ticked already closed.`;
    }

    var ticketHTML = ``;

    for (let i = 0; i < res.messages.length; i++) {
        var ticket = res.messages[i];

        var user = '';

        if (ticket.user == 0) user = 'System';
        if (ticket.user == 1) user = 'You';
        if (ticket.user == 2) user = 'Support';

        ticketHTML += `<div class="card mb-4">
            <div class="card-body">
                <b>${user}:</b><br />
                ${String(ticket.content).replaceAll('&', '&amp').replaceAll('<', '&lt').replaceAll('>', '&gt;').replaceAll("'", '&#39;').replaceAll('"', '&quot;')}
            </div>
            <div class="card-footer">
                ${dayjs().to(dayjs(ticket.date))}
            </div>
        </div>`;
    }

    set('ticket', ticketHTML);
}

async function closeTicket() {
    var res = await superagent
        .get(`/api/ticket/${id}/close`).set('accept', 'json');

    window.location.href = '/tickets';
}

async function postTicketMessage() {
    var msg = get('message');

    try {
        var res = await superagent
            .post(`/api/ticket/${id}/message`)
            .send({ msg }) // sends a JSON post body
            .set('accept', 'json');
        res = res.body;

        window.location.href = `/tickets/view/${id}`;
    } catch (e) {
        var err = JSON.parse(e.message).error;
        error(err);
    }
}

async function loadDeposits() {
    var res2 = await superagent
            .get('/api/userinfo');
        res2 = res2.body;
    set('balance', res2.credits + ' credits');
    set('euro', '€' + (res2.credits/1_000_000).toFixed(3));

    /* Ticket list */
    var res = await superagent
            .get('/api/deposits')
            .set('accept', 'json');
        res = res.body;

    console.log('res', res);

    var ticketHTML = ``;

    for (let i = 0; i < res.length; i++) {
        var ticket = res[i];

        ticketHTML += `<tr>
                  <td>${dayjs().to(dayjs(ticket.date))}</td>
                  <td>€${ticket.amount}</td>
                </tr>`;
    }

    set('deposits', ticketHTML);
}