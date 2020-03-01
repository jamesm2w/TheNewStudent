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

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// register new account
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
		let message = {
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

// confirm registration
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

// search users
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

// login via username/password
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

// login via token
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

// update profile's details - description, etc.
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

// update profile's credentials - password, email, etc.
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

// Make a friend request
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

// Respond to friend request
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

// get user profile
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

// user get friends
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

// get another users profile
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

// get user's groups/classes
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

// get a class
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

// make new class
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

// kick member from class
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

// edit class details
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
});

// get class homework
app.get("/classes/:id/homework", async (req, res) => {
	let id = req.params.id;

	try {
		let homework = await TNS.HomeworkTable.getHomeworkFromClass(id);
		res.send({"success": true, "data": homework});

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log("[CLASS][QUESTION][ERR] " + err);
	}
});

// alter class homework
app.post("/classes/:id/homework/new", async (req, res) => {
	let classId = req.params.id;
	let token = req.get("Security");

	let homeworkObj = req.body;

	try {
		let user = await TNS.TokensTable.getUser(token);
		
		if (user.classLevel < 0 || user.adminLevel < 0) throw "Missing Permissions";

		let newHomework;

		if (homeworkObj.questionSet) {
			// theres already a question set that the user wants to set as homework.
			newHomework = await this.tns.run("INSERT INTO Homework (classId, setId, dueDate) VALUES (?,?,?)", 
				[classId, homeworkObj.questionSet, homeworkObj.due]);

			res.send(JSON.stringify({"success": true}));
		} else {
			// we want to make a new one

			newHomework = await TNS.HomeworkTable.createNewHomework(
				classId, user.id, homeworkObj.due, homeworkObj.difficulty, homeworkObj.subject, homeworkObj.number,
				homeworkObj.questions
				);

			res.send(JSON.stringify({"success": true}));
		}

		if (newHomework.lastID) {
			console.log(newHomework);
			let homework = await TNS.HomeworkTable.getHomeworkFromId(newHomework.lastID);
			console.log(await TNS.get("SELECT * FROM Homework WHERE id = ?", [newHomework.lastID]));
			console.log(homework);
			let classMembers = await TNS.ClassMembershipTable.getClassMembers(classId);
			for (let member of classMembers) {

				let memberPrivate = await TNS.get("SELECT * FROM UsersPrivate WHERE id = ?", [member.userId]);

				let message = {
					from: "admin@thenewstudent.xyz",
					to: memberPrivate.email,
					subject: "You've been set homework on TheNewStudent " + member.username + "!",
					text: `You've been set homework on TheNewStudent by ${user.username}. Visit https://localhost:2020/#class to complete it`,
					html: `<h1>You've been set homework on TheNewStudent by ${user.username}.</h1>
					 <p>Visit https://localhost:2020/#class to complete it</p>`
				};


				try {
					await TNS.ProgressTable.createProgress(member.userId, homework.setId, homework.number);
					await TNS.sendMail(message);
				} catch (err) {
					console.log("[ERR] Creating progress for " + member.username);
					console.log(err);
				}
			}
		}

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log("[CLASS][HWK][ERR] " + err);
	}

});

// delete class homework
app.post("/classes/:id/homework/delete", async (req, res) => {
	let id = req.params.id;
	let token = req.get("Security");

	try {
		let user = await TNS.TokensTable.getUser(token);

		if (user.classLevel > 0) {
			await TNS.HomeworkTable.deleteHomeworkWithClass(id);
			res.send(JSON.stringify({"success": true}));
		} else {
			throw "Missing Permissions";
		}
	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log("[CLASS][QUESTION][ERR] " + err);
	}
});

// get users question sets
app.get("/profile/questions", async (req, res) => {
	let token = req.get("Security");

	try {
		let user = await TNS.TokensTable.getUser(token);
		let sets = await TNS.ProgressTable.getAllUserProgress(user.id);

		res.send(JSON.stringify({"success": true, "data": sets}));
	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

// get question set progress
app.get("/profile/questionSet/progress", async (req, res) => {

	let setId = req.query.id;
	let token = req.get("Security");

	try {
		let user = await TNS.TokensTable.getUser(token);
		let progress = await TNS.ProgressTable.getProgress(parseInt(user.id), parseInt(setId));
		//console.log(user);
		//console.log(user.id, setId);
		//console.log(progress);
		res.send(JSON.stringify({"success": true, "data": progress}));

	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}

});

app.get("/profile/questionSet/delete", async (req, res) => {
	let setId = req.query.id;
	let token = req.get("Security");

	try {
		let user = await TNS.TokensTable.getUser(token);
		let setIsHomework = await TNS.QuestionSetTable.isHomework(setId);

		if (!setIsHomework) {
			await TNS.ProgressTable.deleteProgress(parseInt(user.id), parseInt(setId));
			await TNS.QuestionSetTable.deleteQuestionSet(parseInt(setId));
			res.send(JSON.stringify({"success": true}));
		} else {
			res.send(JSON.stringify({"success": false, "reason": "Can't delete homework"}));
		}
	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

app.post("/profile/questions/:id/help", async (req, res) => {
	let setId = req.params.id;
	let token = req.get("Security");

	let response = req.body; // => id: "1", answer: "abc"

	try {
		let userAnswering = await TNS.TokensTable.getUser(token);
		let questionSet = await TNS.QuestionSetTable.getQuestionSet(setId);
		let isSetHomework = await TNS.QuestionSetTable.isHomework(setId);
		let theQuestion = await TNS.QuestionTable.getQuestion(response.id);


		if (isSetHomework) {
			let homework = await TNS.QuestionSetTable.getHomework(questionSet.id);
			let message = {
				from: "admin@thenewstudent.xyz",
				to: homework[0].email,
				subject: `${userAnswering.username} requests help on TheNewStudent`,
				text: `User: ${userAnswering.username}\n\nQuestion: ${theQuestion.text}\n\nCurrent Answer: ${response.answer}\n\nCorrect Answer: ${theQuestion.correct}`,
				html: `<h3>${userAnswering.username} needs help.</h3>
				<ul>
				<li>Question Text: ${theQuestion.text}</li>
				<li>User's Answer: ${response.answer}</li>
				<li>Correct Answer: ${theQuestion.correct}</li>
				</ul>`
			}
			TNS.sendMail(message);
			res.send(JSON.stringify({"success": true}));
		} else {
			res.send(JSON.stringify({"success": false, "reason": "Not Homework"}));
		}
	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

// post an answer to a question
app.post("/profile/questions/:id/answer", async (req, res) => {

	let setId = req.params.id;
	let token = req.get("Security");

	let response = req.body; // => id: "1", answer: "abc"

	try {
		let userAnswering = await TNS.TokensTable.getUser(token);
		let questionSet = await TNS.QuestionSetTable.getQuestionSet(setId);
		let userProgress = await TNS.ProgressTable.getProgress(userAnswering.id, questionSet.id);
		let isSetHomework = await TNS.QuestionSetTable.isHomework(setId);
		let theQuestion = await TNS.QuestionTable.getQuestion(response.id);
		let isCorrectAnswer = await TNS.QuestionTable.checkAnswer(response.id, response.answer);
			
		if (userProgress) {

			let isSetComplete = await TNS.ProgressTable.incrementQuestionNum(userAnswering.id, questionSet.id);

			if (isCorrectAnswer == -1) {
				if (isSetHomework) {
					let homework = await TNS.QuestionSetTable.getHomework(questionSet.id);
					// Email teacher with answer

					let message = {
						from: "admin@thenewstudent.xyz",
						to: homework[0].email,
						subject: "Answer Submitted on TheNewStudent",
						text: `User ${userAnswering.username} submitted an answer to "${theQuestion.text}".\n\nThey said: ${response.answer}.\n\nCorrect Answer: ${theQuestion.correct}`,
						html: `<h3>User ${userAnswering.username} submitted an answer</h3><p>Question Text: ${theQuestion.text}</p><p>User Response: ${response.answer}</p><p>Correct Answer: ${theQuestion.correct}</p>`
					}
					await TNS.sendMail(message);
					res.send(JSON.stringify({"success": true, "result": "inconclusive"}));
				} else {
					// return it to user
					res.send(JSON.stringify({"success": true, "result": "inconclusive", "correct": theQuestion.correct}));
				}
			} else if (isCorrectAnswer) {

				let userLevel = userAnswering.points / 10;
				let points = 2;
				if (theQuestion.difficulty > userLevel) {
					points = Math.round(5 * Math.sqrt(theQuestion.difficulty - userLevel));
				} else if (theQuestion.difficulty < userLevel) {
					points = Math.round(- Math.sqrt(userLevel - theQuestion.difficulty)) + 3;
				}

				if (points < 0) points = 0;

				await TNS.ProgressTable.addPoints(userAnswering.id, questionSet.id, points);
				await TNS.ProgressTable.incrementCorrectQuestions(userAnswering.id, questionSet.id);
				res.send(JSON.stringify({"success": true, "result": "correct", "points": points}));

			} else {
				await TNS.ProgressTable.addPoints(userAnswering.id, questionSet.id, 
					Math.floor(Math.random() * 2));
				res.send(JSON.stringify({"success": true, "result": "incorrect"}));
			}

			if (isSetComplete) {
				console.log("Adding points to user");
				await TNS.ProgressTable.addPointsToUser(userAnswering.id, questionSet.id);
			}

		} else {
			throw "Missing Progress Obj for this user";
		}


	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

// creates new question set
app.post("/profile/questions/new", async (req, res) => {
	let token = req.get("Security");
	let questionSetObj = req.body;
	// => difficulty: easy, subject: "maths", number: 5, questions: [1,2,3] OR null (random selection)

	try {
		let user = await TNS.TokensTable.getUser(token);
		let set = await TNS.QuestionSetTable.createQuestionSet(user.id, questionSetObj.difficulty, questionSetObj.subject,
			questionSetObj.number);

		if (questionSetObj.questions) {

			for (let qId of questionSetObj.questions) {
				try {
					await TNS.QuestionListTable.addQuestionToSet(set.lastID, qId);
				} catch (err) {
					console.log("[QUESTION] [ERR] Making new QSet.")
					console.log(err);
				}
			}
		} else {
			try {
				await TNS.QuestionSetTable.randomFillSet(set.lastID);
			} catch (err) {
				console.log(err);
				TNS.QuestionSetTable.deleteQuestionSet(set.lastID);
				throw err;
			}
		}

		await TNS.ProgressTable.createProgress(user.id, set.lastID, questionSetObj.number);
		res.send(JSON.stringify({"success": true, "id": set.lastID}));

	} catch (err) {
		console.log(err);
		res.send(JSON.stringify({"success": false, "reason": err}));
	}
});

// create new question
app.post("/questions/new", async (req, res) => {
	try {
		let question = await TNS.QuestionTable.createQuestion(req.body);
		res.send(JSON.stringify({"success": true, "id": question.lastID}))
	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log(err);
	}
});

// search for questions by subject
app.get("/questions/search", async (req, res) => {
	console.log(req.query.subject);
	try {

		let questions = await TNS.QuestionTable.getQuestionsWithSubject(req.query.subject);

		res.send(JSON.stringify({"success": true, "data": questions}));

	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log(err);
	}
});

// fetch question with id
app.get("/questions/:id", async (req, res) => {
	try {
		let question = await TNS.QuestionTable.getQuestion(req.params.id);
		
		res.send(JSON.stringify({"success": true, "data": question}));
	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log(err);
	}
});

app.get("/questionSet/:id", async (req, res) => {
	try {
		let data = await TNS.QuestionListTable.getQuestionsInSet(req.params.id);

		for (let q of data) {
			q.correct = undefined;
		}

		res.send(JSON.stringify({"success": true, "data": data}));
	} catch (err) {
		res.send(JSON.stringify({"success": false, "reason": err}));
		console.log(err);
	}
});

// to james looking at this tommorrow: 
//1: [make a way for a user to create a question set, selecting the questions and random]
//3:  [make a way for a user to create a question]
//4:  [make a way to find questions]
//5:  [make a way to complete a question set.]
//6:  do all the client stuff - HTML, JS, CSS
//7:  something like DM chat and "ask for help"

var listener = wss.listen(2020, () => {
  console.log(`App is listening on port ${listener.address().port}`);
});