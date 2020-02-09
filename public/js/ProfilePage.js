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

	refreshPage () {
		if (asm.currentPage == "profile") {
			asm.profilePage.afterPageShow();
		}
	}

	async fetchProfile () {
		let profile = await Request.get("/profile?t=" + (new Date()).getTime()).execute();
		let friends = await Request.get("/profile/friends?t=" + (new Date()).getTime()).execute();

		this.stateManager.profile = profile.data;
		this.stateManager.profile.friends = friends.data; 
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
				this.fetchProfile().then(this.refreshPage);
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
				this.stateManager.toast("Successfully Updated Credentials");
				this.fetchProfile().then(this.refreshPage);
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
			let result = await Request.get(`/username?username=${username.value}&search=true`).execute();

			if (result.success) {

				let data = {};

				for (var i = 0; i < result.data.length; i++) {
					let currentEl = result.data[i];

					if (currentEl.username == asm.profile.username) {
						continue;
					}

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
				this.fetchProfile().then(this.refreshPage);
			} else {
				this.stateManager.toast(result.reason);
			}

		} catch (e) {
			console.log(e);
			this.stateManager.toast("Error in server communication");
		}

	}

	async removeFriendRequest (user) {
		try {

			let data = await Request.get(`/friendRequest?username=${user}&reject=true&accept=false`).execute();
			if (data.success) {
				asm.toast("Rejected friend request from " + user);
				this.fetchProfile().then(this.refreshPage);
			} else {
				asm.toast(data.reason);
			}

		} catch (e) {
			console.log(e);
			asm.toast("Error in server communication");
		}
	}

	async acceptFriendRequest (user) {
		try {
			
			let data = await Request.get(`/friendRequest?username=${user}&accept=true&reject=false`).execute();
			if (data.success) {
				asm.toast("Accepted friend request from " + user);
				this.fetchProfile().then(this.refreshPage);
			} else {
				asm.toast(data.reason);
			}

		} catch (e) {
			console.log(e);
			asm.toast("Error in server communication");
		}
	}

	afterPageShow () {

		if (!this.stateManager.loggedIn) {
			window.location.hash = "home";
			return;
		}

		if (typeof this.stateManager.profile == "undefined") {
			this.stateManager.toast("Error fetching profile information, try again");
			this.stateManager.profilePage.fetchProfile();
			//this.stateManager.profilePage.refreshPage();

			window.location.hash = "home";
			return;
		}

		let profile = JSON.parse(JSON.stringify(this.stateManager.profile));

		profile.verified = profile.classLevel >= 1;
		profile.moderator = profile.chatLevel >= 1;
		profile.admin = profile.adminLevel >= 1;

		profile.submitUserDetails = "asm.profilePage.userDetails()";
		profile.submitUserCredentials = "asm.profilePage.userCredentials()";
		profile.sendFriendRequest = "asm.profilePage.sendFriendRequest()";
		profile.fieldChange = "asm.profilePage.findUser()";

		if (profile.friends) {
			for (let i = 0; i < profile.friends.length; i++) {
				let friend = profile.friends[i];

				if (friend.verified == 0) {
					friend.pending = true;
				}
			}
		}

		let jumbotronEl = Handlebars.compile(document.getElementById("profileJumbotron").innerHTML);

		$("#profileRow")[0].innerHTML = jumbotronEl(profile);
		
		this.stateManager.intialiseModules();
		M.Collapsible.init($(".collapsible"), {});
    	M.Autocomplete.init($(".autocomplete"), {limit: 10});
	}

	async showProfileModal (username) {
		console.log(username);

		if (username == asm.profile.username) {
			M.Modal.getInstance($("#userProfileModal")[0]).close();
			return;
		}

		try {
			let data = await Request.get(`/profile/user/` + username, {}).execute();

			if (data.success) {
				let modal = M.Modal.getInstance($("#userProfileModal")[0]);

				let userProfileModal = Handlebars.compile(document.getElementById("userProfileTemplate").innerHTML);

				data.data.verified = data.data.classLevel >= 1;
				data.data.moderator = data.data.chatLevel >= 1;
				data.data.admin = data.data.adminLevel >= 1;

				$("#userProfileModal")[0].innerHTML = userProfileModal(data.data);

				modal.open();
			} else {
				throw data.reason;
			}
		} catch (err) {
			console.log(err);
			asm.toast("Error in server communication")
		}
		
	}
	
}