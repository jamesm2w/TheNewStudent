const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const uuidv1 = require('uuid/v1')
const app = express();
const fs = require("fs");

const wss = require("http").Server(app);
const io = require("socket.io")(wss);

const TheNewStudent = require("./TheNewStudent.js", io);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.static("node_modules/materialize-css/dist"));
app.use(express.static("node_modules/handlebars/dist"));

const dbFile = __dirname + "/database.db";
const sqlite3 = require("sqlite3").verbose();

const TNS = new TheNewStudent(dbFile, io);

//wss.listen(3000, () => {
//	console.log("WebSocketServer listening on *:3000");
//})

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/register", async (req, res) => {
	let obj = req.body;
	obj.password = crypto.createHash('md5').update(obj.password).digest('hex');
	//console.log(obj);

	try {
		await TNS.UsersTable.registerUser(obj.username, obj.password, obj.email, obj.dob, obj.regToken);

		let user = await TNS.get("SELECT * FROM Users WHERE username = ? AND password = ?", [obj.username, obj.password]);
		console.log("[REG] New Reg: ")	
		console.log(user);
		let token = await TNS.TokensTable.createToken(user.id);

		// Create Profile and User Levels
		await TNS.ProfilesTable.createProfile(user.id);
		await TNS.UserLevelTable.createUserLevels(user.id);

		try {
			let classesToJoin = await TNS.ClassesTable.getClassFromToken(obj.regToken);
			for (let classX of classesToJoin) {
				console.log("[REG][CLASS] " + user.id + " joining " + classX.id);
				await TNS.ClassMembershipTable.createMembership(classX.id, user.id);
			}
		} catch (err) {
			console.log(err);
		}

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

		res.send(JSON.stringify({"success": true}));
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

	let search = req.query.search;

	try {

		let data = await TNS.UsersTable.getAllWithUsername(username, search);

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

	console.log("[LOGIN] Login Recv: ")
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
	console.log("[LOGIN] Authenticate Recv: ")
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
			TNS.ProfilesTable.setPicture(userId.id, newDetails.picture);
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
			TNS.UsersTable.changeUserPassword(userId.id, newDetails.description);
		}

		if (newDetails.email) {
			TNS.UsersTable.changeUserEmail(userId.id, newDetails.email);
		}

		if (newDetails.token) {
			TNS.UsersTable.changeUserToken(userId.id, newDetails.token);

			try {
				let classesToJoin = await TNS.ClassesTable.getClassFromToken(newDetails.token);
				for (let classX of classesToJoin) {
					console.log("[PROFILE][CLASS] " + userId.id + " joining " + classX.id);
					await TNS.ClassMembershipTable.createMembership(classX.id, userId.id);
				}
			} catch (err) {
				console.log(err);
			}

		}

		var message = {
			from: "admin@thenewstudent.xyz",
			to: userId.email,
			subject: "TheNewStudent Details Edited",
			text: `Your TheNewStudent account details have been changed. If this was you then you can ignore this email.
			If this wasn't you then you can change you password here: http://localhost:2020/lostPassword?token=${req.get("Security")}`,
		};
		await TNS.sendMail(message);

		res.send(JSON.stringify({"success": true}));

	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({"success": false, "reason": e}));
	}
});

app.post("/friendRequest", async (req, res) => {
	let token = req.get("Security");
	let userToFriend = req.body.username;
	try {
		let userA = await TNS.TokensTable.getUser(token);
		let userB = await TNS.UsersTable.getFromUsername(userToFriend);

		if (userA.username == userB.username) throw "Can't befriend yourself";

		await TNS.FriendshipsTable.newFriendship(userA.id, userB.id);

		let message = {
			from: "admin@thenewstudent.xyz",
			to: userB.email,
			subject: "TheNewStudent Friend Request",
			text: `You have recieved a friend reqest from ${userA.username}. To accept or reject this request log in to TheNewStudent.`
		}
		await TNS.sendMail(message);

		res.send(JSON.stringify({"success": true}));
	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.get("/friendRequest", async (req, res) => {
	let token = req.get("Security");
	let accept = req.query.accept === "true";
	let reject = req.query.reject === "true";

	try {
		let userA = await TNS.TokensTable.getUser(token);
		let userB = await TNS.UsersTable.getFromUsername(req.query.username);
		
		if (accept && !reject) {
			await TNS.FriendshipsTable.verifyFriendship(userA.id, userB.id);
			res.send(JSON.stringify({"success": true, "friends": await TNS.FriendshipsTable.getFriendArray(userA.id)}));

		} else if (reject && !accept) {
			await TNS.FriendshipsTable.deleteFriendship(userA.id, userB.id);
			res.send(JSON.stringify({"success": true, "friends": await TNS.FriendshipsTable.getFriendArray(userA.id)}));

		} else {
			res.send(JSON.stringify({"success": false, "reason": "Malformed request"}));
		}

	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({"success": false, "reason": e}));
	}
});

app.get("/profile", async (req, res) => {	
	let token = req.get("Security");
	try {
		let user = await TNS.TokensTable.getUser(token);

		res.send(JSON.stringify({"success": true, "data": user}));

	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.get("/profile/friends", async (req, res) => {
	let token = req.get("Security");
	try {
		let user = await TNS.TokensTable.getUser(token);

		if (typeof user == "undefined") throw "User not found";

		let friends = await TNS.FriendshipsTable.getFriendArray(user.id);

		res.send(JSON.stringify({"success": true, "data": friends}));

	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.get("/profile/user/:username", async (req, res) => {
	let reqUser = req.params.username;

	try {
		let user = await TNS.get("SELECT * FROM UsersPublic WHERE username = ?", [reqUser]);
		console.log(user);
		let userFriends = await TNS.FriendshipsTable.getFriendArray(user.id);

		user.friends = userFriends;

		res.send(JSON.stringify({"success": true, "data": user}));
	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.get("/profile/groups", async (req, res) => {
	let token = req.get("Security");

	try {
		let user = await TNS.TokensTable.getUser(token);
		let classes = await TNS.ClassMembershipTable.getUserClasses(user.id);

		res.send(JSON.stringify({"success": true, "data": classes}));

	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.get("/classes", async (req, res) => {
	let token = req.get("Security");

	try {
		let id = req.query.id;

		let reqClass = await TNS.ClassesTable.getClass(id);
		let members = await TNS.ClassMembershipTable.getClassMembers(id);

		reqClass.members = members;

		res.send(JSON.stringify({"success": true, "data": reqClass}))
	} catch (e) {
		console.log(e);
		res.send(JSON.stringify({"success": false, "reason": e}));
	}
});

app.post("/classes/new", async (req, res) => {

	let classObj = req.body; 
	console.log("[CLASS] Create")
	console.log(classObj);
	try {

		let data = await TNS.ClassesTable.createClass(classObj.name, classObj.owner, classObj.ref);
		//console.log(data);
		if (data.lastID) {
			let id = data.lastID;

			await TNS.ClassMembershipTable.createMembership(id, classObj.owner, 1);

			if (classObj.description) {
				await TNS.ClassesTable.setDescription(id, classObj.description);
			}
			if (classObj.picture) {
				await TNS.ClassesTable.setPicture(id, classObj.picture);
			}
		}

		res.send(JSON.stringify({"success": true}));
		
	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log(err);
	}

});

app.get("/classes/:id/kick", async (req, res) => {
	let classId = req.params.id;
	let userId = req.query.id;
	let token = req.get("Security");

	try {

		let authUser = await TNS.TokensTable.getUser(token);
		let userClassRelationship = await TNS.ClassMembershipTable.getUserClassRelationship(classId, authUser.id);

		if ((authUser.classLevel > 0 || authUser.adminLevel > 0) && userClassRelationship.level > 0) {
			await TNS.ClassMembershipTable.removeUserMembership(classId, userId);
			console.log("[CLASS] User[" + authUser.id + "] kicking User[" + userId + "] from Class[" + classId + "]")
			res.send(JSON.stringify({"success": true}));
		} else {
			throw "Missing Permissions";
		}

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log("[CLASS][ERR]")
		console.log(err);
	}
});

app.post("/classes/:id/edit", async (req, res) => {
	let id = req.params.id;
	let newDetails = req.body;
	let token = req.get("Security");

	console.log("[CLASS] Edit Class[" + id + "]");
	console.log(newDetails);

	try {

		let user = await TNS.TokensTable.getUser(token);

		if (newDetails.description) {
			await TNS.ClassesTable.setDescription(id, newDetails.description);
		} 

		if (newDetails.picture) {
			await TNS.ClassesTable.setPicture(id, newDetails.picture);
		}

		if (newDetails.reference) {
			await TNS.ClassesTable.setReference(id, newDetails.reference);
		}

		if (newDetails.delete) {
			if (user.classLevel > 0 || user.adminLevel > 0) {
				await TNS.ClassesTable.deleteClass(id);
			} else {
				throw "Missing Permissions";
			}
		}

		if (newDetails.owner) {
			let owner = await TNS.get("SELECT * FROM UsersPrivate WHERE id = ?", [newDetails.owner]);

			if ((user.classLevel > 0 || user.adminLevel > 0) && (owner.classLevel > 0 || user.adminLevel > 0)) {
				await TNS.ClassesTable.changeOwner(id, newDetails.owner);
			} else {
				throw "Missing Permissions";
			}

		}

		res.send(JSON.stringify({"success": true}));

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log("[CLASS][ERR]")
		console.log(err);
	}
})

var listener = wss.listen(2020, () => {
  console.log(`App is listening on port ${listener.address().port}`);
});