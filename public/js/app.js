// APP js

function afterHomeShow () {

	M.Tabs.init($(".tabs"), {});

	document.getElementById("loginLink").addEventListener("click", e => {
		e.preventDefault();
		
		let username = document.getElementById("username").value,
			password = document.getElementById("password").value,
			remember = document.getElementById("remember").checked;

		this.stateManager.checkLogIn(username, password, remember);
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

			this.stateManager.registerNewUser(username, password, email, dob, regToken);
		} else {

			if (email !== emailConfirm) M.toast({html: "Emails not the same"});
			if (password !== passwordConfirm) M.toast({html: "Passwords not the same"});

			if (password.length <= 8) M.toast({html: "Password not secure enough"});

			if (!document.getElementById("registerEmail").classList.contains("valid")) M.toast({html: "Invalid Email Address"});
		}
	});

	$("#sendLostPassword")[0].addEventListener("click", e => {
		e.preventDefault();
		let emailAddress = document.getElementById("lostPasswordEmail");

		if (emailAddress.classList.contains("valid")) {
			this.stateManager.userLostPassword(emailAddress.value);
		} else {
			M.toast({html: "Invalid Email"});
		}
	});

	$("#registerUsername")[0].addEventListener("input", e => {
		this.stateManager.checkUserNameStatus(e.target.value);
	});

	if (this.stateManager.appStorage.hasKey("rememberedCredentials")) {
		let savedCredentials = this.stateManager.appStorage.getJSON("rememberedCredentials");

		$("#username")[0].value = savedCredentials.username;
		$("#password")[0].value = savedCredentials.password;

		M.updateTextFields();
	}
}

function beforeProfileShow () {
	if (!this.stateManager.loggedIn) { 
		M.toast({html: "You must be logged in to navigate to page 'profile'"});
		return false;
	}
	return true;
}

function afterProfileShow () {
	M.AutoInit();

	if (!this.stateManager.loggedIn || typeof this.stateManager.profile == "undefined") {
		M.toast({html: "Error recieveing profile data from server"});
	} else {
		let profile = this.stateManager.profile;

		document.getElementById("profileUsername")
		document.getElementById("profileDescription")
		document.getElementById("profilePoints")

		document.getElementById("profilePicture")
		document.getElementById("profileBadges")

		// something with friends list and handlebars maybe

		// bind event listeners to forms

		// fetch and display current homeworks and stuff
	}

}

/*var router = new Router([
	new Route("home", "home.html", onHomeShow, true),
	new Route("profile", "profile.html"),
	new Route("class", "class.html"),
	new Route("questions", "questions.html"),
	new Route("chat", "chat.html")
]);*/

var $ = selector => document.querySelectorAll(selector);

var asm = new ApplicationStateManager();

document.addEventListener("DOMContentLoaded", () => {
	M.Sidenav.init($(".sidenav"), {});
	M.Tabs.init($(".tabs"), {});
	M.Dropdown.init($(".dropdown-trigger"), {});
    M.Modal.init($(".modal"), {});
    M.Datepicker.init($(".datepicker"), {format: "dd mmm yyyy", container: document.querySelector("body"), showClearBtn: true});
});

