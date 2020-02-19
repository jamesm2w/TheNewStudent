class ClassPage {
	constructor (asm) {
		this.stateManager = asm;
		this.route = new Route("class", "class.html", this.afterPageShow, this.beforePageShow);
	}

	static async createNewClass (e) {
		let name = $("#newClassName")[0];
		let description = $("#newClassDescription")[0];
		let picture = $("#newClassPicture")[0];
		let ref = $("#newClassReference")[0];

		if (name.value != "" && 
			description.value != "" && 
			picture.value != "" && 
			ref.value != "" && 
			!(description.classList.contains("invalid")) &&
			!(ref.classList.contains("invalid"))
		) {
			// send it
			try {
				let request = await Request.post("/classes/new", {
					"name": name.value,
					"description": description.value,
					"picture": picture.value,
					"ref": ref.value,
					"owner": asm.profile.id
				}).execute();
				if (request.success) {
					asm.toast("Created class");
				} else {
					asm.toast("Error creating class");
					console.log(request.reason);
				}
			} catch (err) {
				console.log(err);
				asm.toast("Server communication error");
			}
		} else {
			asm.toast("One or more fields invalid")
		}
	}

	async switchClass (id) {
		try {

			let classData = await Request.get(`/classes?id=${id}`).execute();

			if (!classData.success) {
				throw classData.reason;
			} else {

				classData.data.verified = 
			this.stateManager.profile.username == classData.data.ownerUsername || 
			this.stateManager.profile.adminLevel > 0;

				$("#classContainer")[0].innerHTML = Handlebars.compile($("#classInfoPanel")[0].innerHTML)(classData.data);

				this.loadClassMembers(classData);
				this.loadClassHomework(id);

				$("#editClassBtn")[0].addEventListener("click", (e) => {
					M.Modal.getInstance($("#editClassModal")[0]).open();

					$("#changeOwner")[0].oninput = e => {
						this.findUser();
					};

					$("#editClassSubmit")[0].onclick = e => {
						let description = $("#editClassDescription")[0];
						let picture = $("#editClassPicture")[0];
						let reference = $("#editClassReference")[0];
						let owner = $("#changeOwner")[0];

						let valid = !description.classList.contains("invalid") && !reference.classList.contains("invalid");
						if (valid) {
							let payload = {
								"description": description.value,
								"picture": picture.value,
								"reference": reference.value,
								"owner": owner.value
							};
							Request.post(`/classes/${id}/edit`, payload).execute().then(res => {
								if (!res.success) { 
									console.log(res.reason);
									M.toast({"html": res.reason});
								} else {
									M.toast({"html": "Edited Class Successfully"});
									this.switchClass(id);
								}
							}).catch(err => {
								console.log(err);
								M.toast({"html": "Error in server communication"})
							});
						}

					}

					$("#deleteClass")[0].onclick = e => {
						let payload = {"delete": true};
						Request.post(`/classes/${id}/edit`, payload).execute().then(res => {
							if (!res.success) { 
								console.log(res.reason);
								M.toast({"html": res.reason});
							} else {
								M.toast({"html": "Deleted Class Successfully"});
								window.location.reload(true);
							}
						}).catch(err => {
							console.log(err);
							M.toast({"html": "Error in server communication"})
						});
					}

				});

			}
		} catch (err) {
			console.log(err);
			this.stateManager.toast("Error in server communication");
		}
	}

	async loadClassMembers (classData) {
		console.log(classData);
		classData.data.verified = 
			this.stateManager.profile.username == classData.data.ownerUsername || 
			this.stateManager.profile.adminLevel > 0;

		for (let member of classData.data.members) {

			member.verified = // you can delete if: you are the owner or you are the admin and the member is not the owner
			this.stateManager.profile.username == classData.data.ownerUsername || 
			this.stateManager.profile.adminLevel > 0;
			member.canDelete = member.verified &&
			classData.data.ownerUsername != member.username;
		}

		console.log(classData);

		$("#classContainer")[0].innerHTML += Handlebars.compile($("#classMemberList")[0].innerHTML)(classData.data);
	}

	async kickClassMember (classId, userId) {

		Request.get(`/classes/${classId}/kick?id=${userId}`).execute().then(res => {
			if (!res.success) {
				console.log(res.reason);
				this.stateManager.toast(res.reason);
			} else {
				this.stateManager.toast("Kicked user from class");
				this.switchClass(classId);
			}
		}).catch(err => {
			this.stateManager.toast("Error in server communication");
			console.log(err);
		});

	}

	async loadClassHomework (id) {
		console.log(id)
	}

	async afterPageShow () {
		try {
			let classData = await Request.get("/profile/groups").execute();

			if (!classData.success) {
				throw classData.reason;
			}

			$("#extraNavbar")[0].innerHTML = `<li>
		<a class="dropdown-trigger" data-target="classSelect">Select Class <i class="material-icons right">arrow_drop_down</i>
		</a></li>`;

			classData.verified = this.stateManager.profile.classLevel > 0;

			$("#classSelect")[0].innerHTML = Handlebars.compile($("#groupDropdown")[0].innerHTML)(classData);

			M.Dropdown.init($(".dropdown-trigger"), {
				constrainWidth: false,
				container: $("body")[0]
			});

			M.Modal.init($("#newClassModal"), {});
			M.Modal.init($("#editClassModal"), {});
			M.Autocomplete.init($("#changeOwner")[0], {limit: 10});
			M.CharacterCounter.init($(".count"), {});
			
			$("#createNewClass")[0].addEventListener("click", ClassPage.createNewClass);

		} catch (err) {
			console.log(err);
			this.stateManager.toast("Error in server communication");
		}
	}

	beforePageShow () {
		if (!this.stateManager.loggedIn) {
			this.stateManager.toast("You must be logged in to view this page");
			return false;
		}

		return true;
	}

	async findUser () {

		let username = $("#changeOwner")[0];
		let autocompleteInstance = M.Autocomplete.getInstance(username);

		try {
			let result = await Request.get(`/username?username=${username.value}&search=true`).execute();

			if (result.success) {

				let data = {};

				for (var i = 0; i < result.data.length; i++) {
					let currentEl = result.data[i];

					if (currentEl.username == asm.profile.username || currentEl.classLevel <= 0) {
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
}