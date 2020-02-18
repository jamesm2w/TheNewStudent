class ChatClient {

	constructor (asm) {
		this.stateManager = asm;
		this.route = new Route("chat", "chat.html", ChatClient.afterPageShow, ChatClient.beforePageShow);
		this.socket = io.connect("/chat");

		this.onlineStatus = "offline";
		this.currentChatGroup = ""; // ID of a group 

		this.bindSocketEvents();
	}

	bindSocketEvents () {
		this.socket.on("message", ChatClient.onMessage);
		this.socket.on("newUser", ChatClient.newUser);
		this.socket.on("userLeft", ChatClient.userLeft);

		this.socket.on("messageDelete", ChatClient.deleteMessage);
		
		this.socket.on("reconnect", (attempts) => {
			console.log("Reconnected with server after" + attempts + " tries");
			console.log("Attempting to log in again");
			this.login();
		});
		
		this.socket.on("disconnect", (reason) => {
			console.log("Disconnected from chat server. reason: " + reason);
			this.stateManager.toast("Disconnected from chat. Trying to reconnect.");
			if (reason === "io server disconnect") {
				// disconnect was called for by server :o
				this.socket.connect();
			}
		});
	}

	login () {

		if (!this.socket) {
			this.socket = io.connect("/chat");

			this.bindSocketEvents();
		}

		this.socket.emit("login", this.stateManager.appStorage.getString("token"), (success, reason) => {
			if (success) {
				console.log("Logged In to Chat");
				this.onlineStatus = "online";
			} else {
				console.log(reason);
				this.stateManager.toast("Error Logging Into Chat. Try Refreshing the Browser");
			}
		})
	}

	logout () {
		this.socket.close();
		this.socket = undefined;

		this.onlineStatus = "offline";
	}

	switchActiveGroup (newGroupId) {
		this.currentChatGroup = newGroupId;

		this.socket.emit("switchActiveGroup", newGroupId, (result, messages) => {
			$("#channelMembers")[0].innerHTML = "";
			console.log(result); // should contain the members and messages
			let memberFunc = Handlebars.compile($("#memberHTML")[0].innerHTML);
			for (let member of result) {
				$("#channelMembers")[0].innerHTML += memberFunc(member);
			}

			if (messages) {
				console.log(messages); // should be the last 10 or so messages in the room
				$("#chatContainer")[0].innerHTML = "";
				for (let message of messages) {
					ChatClient.onMessage(message);
				}
			}
			
		});

		// Set display of thing to thing
		if ($("li.activeGroup")[0]) {

			$("li.activeGroup")[0].classList.remove("activeGroup");
		}

		$(`li[group-ref="${newGroupId}"]`)[0].classList.add("activeGroup");
		
	}

	deleteMessage (id) {
		this.socket.emit("messageDelete", id, (success, reason) => {
			if (!success) {
				console.log(reason);
				if (reason == "permission") {
					this.stateManager.toast("Missing Permission to delete that message");
				}
			}
		});
	}

	static deleteMessage (messageId) {
		let el = $(`#message${messageId}`)[0]; 
		el.innerHTML = "<em class='white-text valign-wrapper'><i class='material-icons'>delete_forever</i> Message Deleted</em>";
		el.classList.remove("grey", "lighten-2")
		el.classList.add("red", "accent-4");
	}

	static newUser (userData) {
		let memberFunc = Handlebars.compile($("#memberHTML")[0].innerHTML);
		$("#channelMembers")[0].innerHTML += memberFunc(userData);
	}

	static userLeft (userList) {
		$("#channelMembers")[0].innerHTML = "";
		
		let memberFunc = Handlebars.compile($("#memberHTML")[0].innerHTML);
		for (let member of userList) {
			$("#channelMembers")[0].innerHTML += memberFunc(member);
		}
	}

	static onMessage (message) {
		if (asm.chatManager.onlineStatus == "offline") return;

		console.log(message);
		message.verified = message.author.classLevel > 0;
		message.admin = message.author.adminLevel > 0;
		message.moderator = message.author.chatLevel > 0;

		message.canBeDeleted = 
			message.author.username == asm.profile.username ||
			asm.profile.chatLevel > 0 || 
			asm.profile.adminLevel > 0;

		let msgtemplate = Handlebars.compile($("#messageHTML")[0].innerHTML);
		$("#chatContainer")[0].innerHTML += msgtemplate(message);

		M.Dropdown.init($(".dropdown-trigger"), {
			constrainWidth: false
		});
	}

	submitMessage () {
		let messageText = $("#messageBox")[0].value;
		let messageFile = $("#messageFile")[0].files[0];
		let fileDataURL = "";

		if (typeof messageFile != "undefined") {
			let fileReader = new FileReader();
			fileReader.addEventListener("load", (res) => {
				fileDataURL = res.target.result;
				
				asm.chatManager.socket.emit("message", {"text": messageText, "attachment": fileDataURL}, (success) => {
					if (success) {
						console.log("successfully sent message");
					} else {
						this.stateManager.toast("Error sending message");
					}
				});

			});
			fileReader.readAsDataURL(messageFile);
		} else {
			asm.chatManager.socket.emit("message", {"text": messageText, "attachment": undefined}, (success) => {
				if (success) {
					console.log("successfully sent message");
				} else {
					this.stateManager.toast("Error sending message");
				}
			});
		}
		
		$("#messageBox")[0].value = "";
		$("#messageFile")[0].value = "";
		$("#messageFileEcho")[0].value = "";
		M.updateTextFields();
	}

	static async afterPageShow () {

		// Initialise Materialize Modules on Page
		M.Dropdown.init($(".dropdown-trigger"), {});
		//M.updateTextFields();

		if (this.stateManager.chatManager.onlineStatus == "offline") {
			this.stateManager.chatManager.login();
		}

		// Send message
		$("#submitMessage")[0].addEventListener("click", this.stateManager.chatManager.submitMessage);

		$("#messageBox")[0].addEventListener("keyup", (e) => {
			if (e.keyCode === 13) { 
				this.stateManager.chatManager.submitMessage();
			} 
		});

		this.stateManager.chatManager.socket.emit("focusChat", true);
		this.stateManager.chatManager.onlineStatus = "online";
		// Get User Groups & switch to first one
		try {
			let result = await Request.get("/profile/groups?t=" + (new Date()).getTime()).execute();

			let groupHTML = Handlebars.compile($("#groupHTML")[0].innerHTML);
			$("#groupsList")[0].innerHTML = groupHTML(result);
			this.stateManager.chatManager.switchActiveGroup(result.data[0].groupID);

			M.Tooltip.init($(".tooltipped"), {});
		
		} catch (err) {
			console.log(err);
			this.stateManager.toast("Server communication error");
		}
	}

	static beforePageShow () {
		if (!this.stateManager.loggedIn) {
			this.stateManager.toast("You must be logged in to view this page");
			return false;
		}

		return true;
	}
}