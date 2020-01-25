class ProfilePage {
	
	constructor (asm) {
		this.stateManager = asm;
		this.route = new Route("profile", "profile.html", this.afterPageShow, this.onPageShow);
	}

	onPageShow () {
		if (!this.stateManager.loggedIn) {
			this.stateManager.toast("You must be logged in to view this page");
			return false;
		}

		return true;
	}

	userDetails () {

		let description = $("#changeDescription")[0];
		let picture = $("#changePicture")[0];

		let newUserDetails = {};

		if (description.value) {
			newUserDetails.description = description.value;
		} 
		if (picture.value) {
			newUserDetails.picture = picture.value;
		}

		let result = Request.post("/updateDetails", newUserDetails).execute();
		result.then(data => {
			if (data.success) {
				this.stateManager.toast("Successfully Updated Details");
			} else {
				this.stateManager.toast(data.reason);
			}
		}).catch(e => {
			this.stateManager.toast("Error in server communication");
			console.log(e);
		});
	}

	userCredentials () {

		let password = $("#changePassword")[0];
		let confirmPassword = $("#confirmPassword")[0];

		let email = $("#changeEmail")[0];
		let confirmEmail = $("#confirmEmail")[0];
		
		let token = $("#changeToken")[0];

		let newUserCredentials = {};

		if (password.value) {

			if (password.value == confirmPassword.value) {
				this.stateManager.toast("Passwords not the same");
				return;
			} else if (password.value.length <= 8) {
				this.stateManager.toast("Password not secure enough");
				return;
			}

			newUserCredentials.password = password.value;
		}

		if (email.value) {

			if (email.value != confirmEmail.value) {
				this.stateManager.toast("Email Addresses not the same");
				return;
			} else if (!email.classList.contains("valid") && email.classList.contains("invalid")) {
				this.stateManager.toast("Invalid Email Address");
				return;
			}

			newUserCredentials.email = email.value;
		}

		if (token.value) {
			newUserCredentials.token = token.value;
		}

		let result = Request.post("/updateCredentials", newUserCredentials).execute();
		result.then(data => {
			if (data.success) {
				this.stateManager.toast("Successfully Updated Credentials")
			} else {
				this.stateManager.toast(data.reason);
			}
		}).catch(e => {
			this.stateManager.toast("Error in server communication");
			console.log(e);
		});
	}

	async findUser () {

		let username = $("#findUsername")[0];
		let autocompleteInstance = M.Autocomplete.getInstance(username);

		try {
			let result = await Request.get(`/username?username=${username.value}`).execute();

			if (result.success) {

				let data = {};

				for (var i = 0; i < result.data.length; i++) {
					let currentEl = result.data[i];

					data[currentEl.username] = currentEl.picture;
				}

				autocompleteInstance.updateData(data);

			} else {
				this.stateManager.toast(result.reason)
			}
		} catch (e) {
			console.log(e);
			this.stateManager.toast("Error in server communication");
		}

	}

	async sendFriendRequest () {
		let username = $("#findUsername")[0].value;

		try {
			let result = await Request.post("/friendRequest", {"username": username}).execute();

			if (result.success) {
				this.stateManager.toast("Friend Request Sent");
			} else {
				this.stateManager.toast(result.reason);
			}

		} catch (e) {
			console.log(e);
			this.stateManager.toast("Error in server communication");
		}

	}


	afterPageShow () {
		console.log("After page shown")
		if (!this.stateManager.loggedIn) {
			window.location.hash = "home";
			return;
		}

		if (typeof this.stateManager.profile == "undefined") {
			this.stateManager.toast("Error fetching profile information, try again");
			this.stateManager.fetchProfile(); // or something like this
			window.location.hash = "home";
			return;
		}

		let profile = JSON.parse(JSON.stringify(this.stateManager.profile.user));

		profile.verified = profile.classLevel >= 1;
		profile.moderator = profile.chatLevel >= 1;
		profile.admin = profile.adminLevel >= 1;

		profile.submitUserDetails = "asm.profilePage.userDetails()";
		profile.submitUserCredentials = "asm.profilePage.userCredentials()";
		profile.sendFriendRequest = "asm.profilePage.sendFriendRequest()";
		profile.fieldChange = "asm.profilePage.findUser()";

		console.log(this);
		console.log(this.userCredentials);

		let jumbotronEl = Handlebars.compile(document.getElementById("profileJumbotron").innerHTML);

		$("#profileRow")[0].innerHTML = jumbotronEl(profile) + $("#profileRow")[0].innerHTML;
		
		M.AutoInit();

		//$("#submitUserDetails")[0].addEventListener("click", this.userDetails);
		//$("#submitUserCredentials")[0].addEventListener("click", this.userCredentials);


	}

	
}