const uuidv1 = require("uuid/v1");
const _ = require("lodash");

class Chat {

	constructor (tns) {
		this.tns = tns;
		this.users = [];
	}

	async connection (user) {

		let clientUser = {"joined": false};

		user.on("joinRequest", async (data, cb) => {

			let sid = uuidv1();
			let username = data.username;
			let dbData = await this.tns.get("SELECT * FROM UsersPublic WHERE username = ?", [username]);
			clientUser = {"sid": sid, "userData": dbData, "joined": true};

			this.users.push(clientUser);
			user.broadcast.emit("userJoin", clientUser);

			console.log("[CHAT] " + username + " joined");
		});

		user.on("sendMessage", (data, cb) => {
			if (!clientUser.joined) {cb("Not Authenticated"); return;}
			user.broadcast.emit("newMessage", {"message": data, "sender": clientUser});
			cb();
			console.log("[CHAT] new message");
		});

		user.on("disconnect", reason => {
			if (!clientUser.joined) {cb("Not Authenticated"); return;}
			_.remove(this.users, clientUser);
			user.broadcast.emit("userLeft", {"user": clientUser, "reason": reason});
			console.log("[CHAT] " + clientUser.userData.username + " disconnected");
		});

		user.on("focusChat", (data, cb) => {
			if (!clientUser.joined) {cb("Not Authenticated"); return;}
			user.broadcast.emit("userFocussed", {"user": clientUser});
			cb();
			console.log("[CHAT] " + clientUser.userData.username + "  set focus");
		});

		user.on("deFocusChat", (data, cb) => {
			if (!clientUser.joined) {cb("Not Authenticated"); return;}
			user.broadcast.emit("userLostFocus", {"user": clientUser});
			cb();
			console.log("[CHAT] " + clientUser.userData.username + " lost focus");
		});
	}

}

module.exports = Chat;