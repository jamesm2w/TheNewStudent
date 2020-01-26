class HomePage {

	constructor (asm) {
		this.stateManager = asm;
		this.route = new Route("home", "home.html", this.onPageShow, undefined, true);
	}

	onPageShow () {
		M.Tabs.init($(".tabs"), {});

		document.getElementById("loginLink").addEventListener("click", e => {
			e.preventDefault();
			
			let username = document.getElementById("username").value,
				password = document.getElementById("password").value,
				remember = document.getElementById("remember").checked;

			this.stateManager.homePage.checkLogIn(username, password, remember);
		});

		let el = $("#register")[0];
		let clone = el.cloneNode(true);
		el.replaceWith(clone);

		clone.addEventListener("click", e => {
			e.preventDefault();

			let username = document.getElementById("registerUsername").value,
				password = document.getElementById("registerPassword").value,
				passwordConfirm = document.getElementById("registerConfirmPassword").value,
				email = document.getElementById("registerEmail").value,
				emailConfirm = document.getElementById("registerConfirmEmail").value,
				dob = document.getElementById("registerDob").value,
				regToken = document.getElementById("registerToken").value;

			let validEmail = (document.getElementById("registerEmail").classList.contains("valid")) && email === emailConfirm;
			let validPassword = password.length > 8 && password === passwordConfirm;

			if (validEmail && validPassword) {

				this.stateManager.homePage.registerNewUser(username, password, email, dob, regToken);
			} else {

				if (email !== emailConfirm) this.stateManager.toast("Emails not the same");
				if (password !== passwordConfirm) this.stateManager.toast("Passwords not the same");

				if (password.length <= 8) this.stateManager.toast("Password not secure enough");

				if (!document.getElementById("registerEmail").classList.contains("valid"))
				 this.stateManager.toast("Invalid Email Address");
			}
		});

		$("#sendLostPassword")[0].addEventListener("click", e => {
			e.preventDefault();
			let emailAddress = document.getElementById("lostPasswordEmail");

			if (emailAddress.classList.contains("valid")) {
				this.stateManager.homePage.userLostPassword(emailAddress.value);
			} else {
				this.stateManager.toast("Invalid Email");
			}
		});

		$("#registerUsername")[0].addEventListener("input", e => {
			this.stateManager.homePage.checkUserNameStatus(e.target.value);
		});

		if (this.stateManager.appStorage.hasKey("rememberedCredentials")) {
			let savedCredentials = this.stateManager.appStorage.getJSON("rememberedCredentials");

			$("#username")[0].value = savedCredentials.username;
			$("#password")[0].value = savedCredentials.password;

			M.updateTextFields();
		}
	}

	async checkLogIn (username, password, remember) {
		try {
			let response = await Request.post("/authenticate", {"username": username, "password": password}).execute();

			if (response.success) {
				// Correct Login
				
				this.stateManager.appStorage.setString("token", response.token);
				this.stateManager.profile = response.user;
				this.stateManager.logIn();

				if (remember) { // WOAH THATS SOME PLAINTEXT PASSWORD STORAGE BETTER CHANGE THAT AT SOME POINT
					this.stateManager.appStorage.setJSON("rememberedCredentials", {"username": username, "password": password});
				}

			} else {
				// Incorrect Login
				this.stateManager.toast("Incorrect Login " + JSON.stringify(response.reason));
			}

		} catch (e) {
			console.warn(e);
			this.stateManager.toast("Server Communication Error");
		}
	}

	async checkToken() {
		let token = this.stateManager.appStorage.getString("token");

		try {
			let response = await Request.get(`/authenticate?token=${token}`).execute();

			if (response.success) {
				// Valid token
				this.stateManager.appStorage.setString("token", response.token);
				this.stateManager.profile = response.user;
				this.stateManager.logIn();

			} else {
				// Invalid token
				this.stateManager.appStorage.removeItem("token");
			}

		} catch (e) {
			console.warn(e);
			this.stateManager.toast("Server Communication Error");
		}
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
				this.stateManager.toast(`Successfully Registered Username "${username}". Check your email for verification.`);
				// clear registration form
			} else {
				this.stateManager.toast(`Error in registration: ${response.reason}`);
			}

		} catch (e) {
			this.stateManager.toast("Server Communication Error");
			console.warn(e);
		}
	}

	async userLostPassword (email) {
		try {
			let response = await Request.post("/lostPassword", {"email": email}).execute();

			if (response.success) {
				this.stateManager.toast(`Password reset link sent to your email address`);
			} else {
				this.stateManager.toast(response.reason);
			}

		} catch (e) {
			this.stateManager.toast("Server Communication Error");
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
				this.stateManager.toast(response.reason);
				console.log(response.reason);
			}
		} catch (e) {
			this.stateManager.toast("Server Communication Error");
			console.warn(e);
		}
	}
}