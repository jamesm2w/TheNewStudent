const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const uuidv1 = require('uuid/v1')
const app = express();
const fs = require("fs");

const TheNewStudent = require("./TheNewStudent.js");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static("node_modules/materialize-css/dist"));
app.use(express.static("node_modules/handlebars/dist"));

const dbFile = __dirname + "/database.db";
const sqlite3 = require("sqlite3").verbose();

const TNS = new TheNewStudent(dbFile);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/register", async (req, res) => {
	let obj = req.body;
	obj.password = crypto.createHash('md5').update(obj.password).digest('hex');
	console.log(obj);

	try {
		await TNS.UsersTable.registerUser(obj.username, obj.password, obj.email, obj.dob, obj.regToken);

		let user = await TNS.get("SELECT * FROM Users WHERE username = ? AND password = ?", [obj.username, obj.password]);
		console.log(user);
		let token = await TNS.TokensTable.createToken(user.id);


		// Create Profile and User Levels
		await TNS.ProfilesTable.createProfile(user.id);
		await TNS.UserLevelTable.createUserLevels(user.id);

		console.log(token);
		// Email and stuff
		// send in email link to /register?token=${token}
		// 
		var message = {
			from: "admin@thenewstudent.xyz",
			to: obj.email,
			subject: "TheNewStudent Registration Email",
			text: `Thanks for signing up to TheNewStudent ${obj.username}.
			Please visit this URL to verify your reigstration: https://localhost:2020/register?token=${token}`,
			html: `<h1>Thanks for signing up to TheNewStudent ${obj.username}.</h1>
			Please click <a href="https://localhost:2020/register?token=${token}">here</a> to verify your registration`
		};
		await TNS.sendMail(message);

		res.send(JSON.stringify({"success": true, "profile": JSON.stringify(user)}));
	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({"success": false, "reason": JSON.stringify(e)}));
	}
	
});

app.get("/register", async (req, res) => {
	let token = req.query.token;
	try {
		let user = await TNS.TokensTable.getUser(token);

		if (!user.verified) {

			await TNS.UsersTable.changeVerifiedUser(user.id);

			res.send("Successfully Verified")

		} else {
			res.send("Unsuccessful. Reason: User already verified");
		} 
	} catch (err) {
		res.send("Unsuccessful. Reason " + err);
	}
});

app.get("/username", async (req, res) => {

	let username = req.query.username;

	try {

		let data = await TNS.UsersTable.getAllWithUsername(username);

		if (data.length == 0 || typeof data == "undefined") {
			res.send(JSON.stringify({"success": true, "taken": false, "data": data}));
		} else {
			res.send(JSON.stringify({"success": true, "taken": true, "data": data}));
		}

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.post("/lostPassword", (req, res) => {
	// EMAIL USER req.body.email
});

app.get("/lostPassword", (req, res) => {
	// GIVE THE UPDATE PASSWORD FORM WITH TOKEN
});

app.post("/authenticate", async (req, res) => {
	

	req.body.password = crypto.createHash('md5').update(req.body.password).digest('hex');

	console.log(req.body);

	try {
		let userObj = await TNS.UsersTable.getUserViaLogin(req.body.username, req.body.password);

		if (typeof userObj != "undefined" && userObj.verified == 1) {

			let token = await TNS.TokensTable.createToken(userObj.id);
			let cleanUserObj = userObj;

			delete cleanUserObj.password;

			res.send(JSON.stringify({"success": true, "token": token, "user": cleanUserObj}));

		} else if (userObj.verified == 0) {

			res.send(JSON.stringify({"success": false, "reason": "User not verified"}));

		} else {
			res.send(JSON.stringify({"success": false, "reason": "Incorrect Login"}));
		}

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.get("/authenticate", async (req, res) => {
	console.log(req.query);

	try {
		let userObj = await TNS.TokensTable.getUser(req.query.token);

		if (typeof userObj != "undefined" && userObj.verified == 1) {

			let cleanUserObj = userObj;

			delete cleanUserObj.password;

			res.send(JSON.stringify({"success": true, "token": req.query.token, "user": cleanUserObj}));

		} else if (userObj.verified == 0) {

			res.send(JSON.stringify({"success": false, "reason": "User not verified"}));

		} else {
			res.send(JSON.stringify({"success": false, "reason": "Unknown Token"}));
		}

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.post("/updateDetails", async (req, res) => {
	let newDetails = req.body;

	try {

		let userId = await TNS.TokensTable.getUser(req.get("Security"));

		if (!userId || typeof userId == "undefined") throw "Couldn't find token.";

		if (newDetails.description) {
			TNS.ProfilesTable.setDescription(userId.id, newDetails.description);
		}

		if (newDetails.picture) {
			TNS.ProfilesTable.setPicture(userId.id, newDetais.picture);
		}

		res.send(JSON.stringify({"success": true}));

	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({"success": false, "reason": e}));
	}
});

app.post("/updateCredentials", async (req, res) => {
	let newDetails = req.body;

	try {

		let userId = await TNS.TokensTable.getUser(req.get("Security"));

		if (!userId || typeof userId == "undefined") throw "Couldn't find token.";

		if (newDetails.password) {
			newDetails = crypto.createHash('md5').update(newDetails.password).digest('hex');
			TNS.UsersTable.setUserPassword(userId.id, newDetails.description);
		}

		if (newDetails.email) {
			TNS.UsersTable.setUserEmail(userId.id, newDetais.email);
		}

		if (newDetails.token) {
			TNS.UsersTable.setUserToken(userId.id, newDetais.token);
		}

		res.send(JSON.stringify({"success": true}));

	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({"success": false, "reason": e}));
	}
});

var listener = app.listen(2020, () => {
  console.log(`App is listening on port ${listener.address().port}`);
});