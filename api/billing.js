const express = require('express');
const app = express.Router();

const lib = require('../lib');
const db = require('../db');

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_KEY);

// 1 credit = €0.000001
// €1       = 1m credits

app.get('/depositlink', async (req, res) => {
    try {
        var user = await db.User.findOne({
            _id: req.session.user._id
        });
        if (!user) {
            throw new Error('User not found');
        }
        res.redirect(`https://meegie.mysellix.io/pay/f9755f-570fad003b-83c032?gateway=LITECOIN&step=GATEWAYS&email=${user.email}&rcid=ref&custom-userid=${encodeURIComponent(user._id)}`);
        // res.redirect(`https://buy.stripe.com/test_6oE6oT8vt6erexqdQQ?client_reference_id=${user._id}&prefilled_email=${encodeURIComponent(user.email)}`);
    } catch (error) {
        console.error('Error in /depositlink route:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/deposits', async (req, res) => {
    try {
        var deps = await db.Deposit.find({
            userID: req.session.user._id
        });
        var depstoSend = [];
        for (let i = 0; i < deps.length; i++) {
            depstoSend.push({
                id: deps[i]._id,
                amount: deps[i].amount,
                date: deps[i].date
            });
        }
        depstoSend.reverse();
        res.json(depstoSend);
    } catch (error) {
        console.error('Error in /deposits route:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/webhookofsellix', express.json(), async (req, res) => {
    console.log(req.headers, req.body);

    const { status, total, customer_email, uniqid, discount_breakdown } = req.body.data;

    console.log(`Status: ${status}, Total: $${total} - $${discount_breakdown.tax_log.total_pre_vat}, Customer Email: ${customer_email}`);

    if (status != 'COMPLETED' && status != 'PAID') {
        console.log(status);
        return res.status(400).send(`Invalid status: ${status}`);
    }

    const user = await db.User.findOne({
        email: customer_email
    });
    if (!user) {
        console.log('User not found');
        return res.status(404).send('User not found');
    }

    user.credits = user.credits + (discount_breakdown.tax_log.total_pre_vat * 1_000_000);
    user.isFree = false;
    await user.save();

    const deposit = new db.Deposit({
        userID: user._id,
        amount: discount_breakdown.tax_log.total_pre_vat,
        name: 'Deposit',
        mail: customer_email,
        paymentID: uniqid,
        date: Date.now()
    });
    await deposit.save();

    console.log(`Deposited $${total} to user ${customer_email}, ${user._id}`);

    res.json({ ok: true });
});

app.post('/webhookofstripe', express.raw({ type: 'application/json', limit: '10mb' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    // console.log('webhook!', req.body);
  
    try {
      event = stripe.webhooks.constructEvent(req.body.toString(), sig, process.env.STRIPE_WH);
    //   console.log('eventID', event.id);
    } catch (err) {
        console.log('Webhook error', err);
        res.status(400).send(`Webhook Error`);
        return;
    }

    if (event.type == 'checkout.session.completed') {
        console.log('A payment has been made!!!!');
        var dat = event.data.object;
        var cust = dat.customer_details;

        var userID = dat.client_reference_id;
        var amount = dat.amount_total/100;

        var name = cust.name;
        var mail = cust.email;

        var user = await db.User.findOne({
            _id: userID
        });
        user.credits = user.credits + (amount * 100_000);
        await user.save();

        var invoice = new db.Deposit({
            userID,
            amount,
            name,
            mail,
            paymentID: dat.id,
            date: Date.now()
        });
        await invoice.save();

        // console.log(`[${dat.id}] -> ${dat.amount_total/100} ${dat.currency}`);
        // console.log(`[${dat.id}] -> U_${dat.client_reference_id}`);
        // var cust = dat.customer_details;
        // console.log(cust.email, cust.name);
    } else {
        console.log('NOO AN INVALID EVETNT!??1!??! ?', event.type)
    }
  
    res.json({ ok: true });
});

module.exports = app;