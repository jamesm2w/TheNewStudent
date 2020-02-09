class ClientChat {

	constructor (asm) {
		this.socket = io.connect("/chat");


		// Listen to events
		this.socket.on("newMessage", function (data) {});
		this.socket.on("userJoin", function (data) {});
		this.socket.on("userLeft", function (data) {});
		this.socket.on("userFocussed", function (data) {});
		this.socket.on("userLostFocus", function (data) {});
	}

	joinRequest () {
		this.socket.emit("joinRequest");
	}

	sendMessage (e) {
		this.socket.emit("sendMessage");
	}

	focusChat () {
		this.socket.emit("focusChat");
	}

	deFocusChat () {
		this.socket.emit("deFocusChat");
	}


}