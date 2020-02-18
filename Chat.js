const uuidv3 = require("uuid/v3");
const _ = require("lodash");

const NAMESPACE = "a22c5f80-f140-497e-91eb-c62f5b648d19";

class Chat {

	constructor (tns, io) {
		this.tns = tns;
		this.io = io;

		this.rooms = {
			// "roomId": [userList]
		};
		this.messageCache = {
			// "roomId": [messageList]
		};
	}

	async connection (user) {
		console.log("Got Connection");

		let clientUser = {"status": "offline"};

		user.on("login", async (token, cb) => {
			console.log(token);
			try {
				let userdata = await this.tns.TokensTable.getPublicUserFromToken(token);
				Object.assign(clientUser, userdata);
				clientUser.status = "online";
				cb(true);
			} catch (e) {
				console.log(e);
				cb(false, e);
			}
		});

		user.on("messageDelete", (messageId, cb) => {
			if (clientUser.status == "offline") {cb(false, "offline"); return;}


			if (clientUser.chatLevel <= 0 && clientUser.adminLevel <= 0 &&
				uuidv3(clientUser.username, NAMESPACE) != messageId.split("_")[0])
				 {
				 	cb(false, "permission"); return;
				 }

			user.broadcast.emit("messageDelete", messageId);
			user.emit("messageDelete", messageId);

			for (let key in this.messageCache) {
				for (let msg of this.messageCache[key]) {
					if (msg.id === messageId) {
						_.remove(this.messageCache[key], msg);
					}
				}
			}

			cb(true);
		});

		user.on("message", (messageData, cb) => {
			console.log(clientUser);
			if (clientUser.status == "offline") {cb(false); return;}

			let rooms = Object.keys(user.rooms);
			console.log(rooms);
			messageData.author = clientUser;
			//console.log(messageData);
			messageData.id = uuidv3(clientUser.username, NAMESPACE) + "_" + (new Date()).getTime().toString();
			
			for (let room of rooms) {
				user.to(room).emit("message", messageData);

				if (room != user.id) {

					if (this.messageCache[room]) {
						this.messageCache[room].push(messageData);

						if (this.messageCache[room].length > 10) {
							this.messageCache[room].shift();
						}

					} else {
						this.messageCache[room] = [messageData];
					}

				}
			}

			user.emit("message", messageData);

			cb(true);
		});

		user.on("switchActiveGroup", (newGroup, cb) => {
			console.log(clientUser);
			if (clientUser.status == "offline") {cb(false); return;}
			console.log(user.id);

			if (Object.keys(user.rooms).includes(newGroup)) {
				cb(this.rooms[newGroup]);
				return;
			}

			for (let room of Object.keys(user.rooms)) {
				
				if (room != user.id) {
					console.log("- " + room);
					user.leave(room);

					_.remove(this.rooms[room], clientUser);
					user.to(room).emit("userLeft", this.rooms[room]);
				}
			}
			console.log("+ " + newGroup);
			user.join(newGroup);
			if (this.rooms[newGroup]) {
				this.rooms[newGroup].push(clientUser)
			} else {
				this.rooms[newGroup] = [clientUser];
			}
			user.to(newGroup).emit("newUser", clientUser);

			cb(this.rooms[newGroup], this.messageCache[newGroup]);
		})

		user.on("disconnect", (reason) => {
			console.log("Disconnect " + reason);
			user.broadcast.emit("userDisconnect", clientUser);
			console.log(this.rooms);
			for (let room of Object.keys(this.rooms)) {
				let removed = _.remove(this.rooms[room], clientUser);

				if (removed) {
					user.to(room).emit("userLeft", this.rooms[room]);
				}
			}
		});

		
	}

}

module.exports = Chat;