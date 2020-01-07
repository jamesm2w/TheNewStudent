class ApplicationStateManager {
	
	constructor (router) {
		this.loggedIn = false;
		this.token = undefined;
		this.profile = undefined;
		this.appStorage = undefined;
		this.pageRouter = this.createRouter();
		this.currentPage = "home";

		document.addEventListener("DOMContentLoaded", () => {
			this.appStorage = new AppStorage();

			if (this.appStorage.hasKey("token")) {
				this.checkToken();
			}
		});
	}

	createRouter () {
		return new Router([
			new Route("home", "home.html", afterHomeShow, undefined, true),
			new Route("profile", "profile.html", undefined, beforeProfileShow),
			new Route("class", "class.html"),
			new Route("questions", "questions.html"),
			new Route("chat", "chat.html")
		], this);
	}

	async checkLogIn (username, password, remember) {
		try {
			let response = await Request.post("/authenticate", {"username": username, "password": password}).execute();

			if (response.success) {
				// Correct Login
				
				this.appStorage.setString("token", response.token);
				this.logIn();

				if (remember) { // WOAH THATS SOME PLAINTEXT PASSWORD STORAGE BETTER CHANGE THAT AT SOME POINT
					this.appStorage.setJSON("rememberedCredentials", {"username": username, "password": password});
				}

			} else {
				// Incorrect Login
				M.toast({html: "Incorrect Login"});
			}

		} catch (e) {
			console.warn(e);
			M.toast({html: "Server Communication Error"});
		}
	}

	async checkToken() {
		let token = this.appStorage.getString("token");

		try {
			let response = await Request.get(`/authenticate?token=${token}`).execute();

			if (response.success) {
				// Valid token
				this.appStorage.setString("token", response.token);
				this.logIn();

			} else {
				// Invalid token
				this.appStorage.removeItem("token");
			}

		} catch (e) {
			console.warn(e);
			M.toast({html: "Server Communication Error"});
		}
	}

	logIn () {

		this.loggedIn = true;
		window.location.hash = "profile";

		M.toast({html: "Logged In"});
		$("#loggedIn")[0].innerHTML = `Logged In
			<a class="waves-effect waves-light btn-flat blue-grey darken-3 white-text" onclick="asm.logOut()">Logout</a>`;

		// TODO: Fetch Profile
	}

	logOut () {
		this.loggedIn = false;
		this.profile = null;
		this.appStorage.removeItem("token");
		
		window.location.hash = "";

		M.toast({html: "Successfully Logged Out"});
		$("#loggedIn")[0].innerText = "Not Logged In";
	}
	
	async registerNewUser (username, password, email, dob, regToken) {
		try {

			let userObj = {
				"username": username,
				"password": password,
				"email": email,
				"dob": dob,
				"regToken": regToken
			};

			let response = await Request.post("/register", userObj).execute();

			if (response.success) {
				M.toast({html: `Successfully Registered Username "${username}". Check your email for verification.`});
				// clear registration form
			} else {
				M.toast({html: `Error in registration: ${response.reason}`});
			}

		} catch (e) {
			M.toast({html: "Server Communication Error"});
			console.warn(e);
		}
	}

	async userLostPassword (email) {
		try {
			let response = await Request.post("/lostPassword", {"email": email}).execute();

			if (response.success) {
				M.toast({html: `Password reset link sent to your email address`});
			} else {
				M.toast({html: response.reason});
			}

		} catch (e) {
			M.toast({html: "Server Communication Error"});
			console.warn(e);
		}
	}

	async checkUserNameStatus (username) {
		try {
			let response = await Request.get(`/username?username=${username}`).execute();

			if (response.success) {

				if (response.taken || username == "") {
					$("#registerUsername")[0].classList.add("invalid");
					$("#registerUsername")[0].classList.remove("valid");
				} else {
					$("#registerUsername")[0].classList.add("valid");
					$("#registerUsername")[0].classList.remove("invalid");
				}

			} else {
				M.toast({html: response.reason});
				console.log(response.reason);
			}
		} catch (e) {
			M.toast({html: "Server Communication Error"});
			console.warn(e);
		}
	}
	
}