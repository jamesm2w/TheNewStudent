class ClassPage {
	constructor (asm) {
		this.stateManager = asm;
		this.route = new Route("class", "class.html", this.afterPageShow, this.beforePageShow);
		ClassPage.addedQuestions = [];
	}

	static async deleteClassHomework (id) {
		try {
			let response = await Request.post(`/classes/${id}/homework/delete`, {}).execute();

			if (response.success) {
				asm.toast("Delete homework successfully");
				asm.classPage.switchClass(id);
			} else {
				asm.toast(response.reason);
			}
		} catch (err) {
			console.log(err);
			asm.toast("Error in server communication");
		}
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
			this.class = id;
			if (!classData.success) {
				throw classData.reason;
			} else {

				classData.data.verified = 
			this.stateManager.profile.username == classData.data.ownerUsername || 
			this.stateManager.profile.adminLevel > 0;

				$("#classContainer")[0].innerHTML = Handlebars.compile($("#classInfoPanel")[0].innerHTML)(classData.data);

				await this.loadClassMembers(classData);
				await this.loadClassHomework(id, classData);

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

	async loadClassHomework (id, classData) {
		try {
			let homeworkData = await Request.get(`/classes/${id}/homework`).execute();
			if (homeworkData.success) {
				
				console.log(homeworkData.data);

				homeworkData.verified = this.stateManager.profile.username == classData.data.ownerUsername || 
							this.stateManager.profile.adminLevel > 0;

				homeworkData.classId = id;

				$("#classContainer")[0].innerHTML += Handlebars.compile($("#classHomework")[0].innerHTML)(homeworkData);

			} else {
				this.stateManager.toast(homeworkData.reason);
				console.log(homeworkData.reason);
			}
		} catch (err) {
			console.log(err);
			this.stateManager.toast("Error in server communication");
		}
	}

	static async openHomeworkModal () {
		let modalInstance = M.Modal.getInstance($("#createHomework")[0]);

		let dueInstance = M.Datepicker.getInstance($("#chooseDueDate")[0]);
		if (!dueInstance) {
			M.Datepicker.init($("#chooseDueDate"), {
				minDate: new Date(),
				showDaysInNextAndPreviousMonths: true,
				container: $("body")[0]
			});
		}

		//let selectInstance = M.FormSelect.getInstance($("#questionSetSelect")[0]);
		//if (!selectInstance) {
		//	M.FormSelect.init($("#questionSetSelect"));
		//}

		$("#createHomeworkSubject")[0].oninput = async (e) => {
			try {

				let response = await Request.get(`/questions/search?subject=${e.target.value}`).execute();
				if (response.success) {
					$("#searchQuestionResults")[0].innerHTML = "";
					for (let question of response.data) {
						question.add = true;
						$("#searchQuestionResults")[0].innerHTML += 
							Handlebars.compile($("#questionListQuestion")[0].innerHTML)(question);
					}

					if (response.data == []) {
						$("#searchQuestionResults")[0].innerHTML += `<li>No Questions Matching</li>`;
					}
				} else {
					asm.toast(response.reason);
				}

			} catch (err) {
				console.log(err);
				asm.toast("Error in server communication");
			}
		}

		$("#createHomeworkSubmit")[0].onclick = async (e) => {
				
			if($("#chooseDueDate").value == "") {asm.toast("Set a due date"); return};

			if ($("#questionSetSelect")[0].value == 0 || $("#questionSetSelect")[0].value == "") {

				let difficulty = $("#difficultySelect")[0].value;
				let subject = $("#createHomeworkSubject")[0].value;

				if (difficulty == "" || subject == ""){ asm.toast("Set a difficulty/subject"); return;}

				let questions = ClassPage.addedQuestions;
				if (questions == [] || questions.length == 0){ asm.toast("You must set at least 1 question"); return;}

				console.log(difficulty, subject, questions.length, questions);
				let resp = await Request.post(`/classes/${asm.classPage.class}/homework/new`, {
					"due": $("#chooseDueDate").value,
					"difficulty": difficulty,
					"subject": subject,
					"number": questions.length,
					"questions": questions
				}).execute();

				console.log(resp);
				if (resp.success) {
					asm.toast("Created homework");
					asm.classPage.switchClass(asm.classPage.class);
				} else {
					asm.toast(JSON.stringify(resp.reason));
				}
			
			} else {
				let resp = await Request.post(`/classes/${asm.classPage.class}/homework/new`, {
					"questionSet": $("#questionSetSelect")[0].value, 
					"due": $("#chooseDueDate").value 
				}).execute();

				console.log(resp);
				if (resp.success) {
					asm.toast("Created homework");
				} else {
					asm.toast(JSON.stringify(resp.reason));
				}
			}

			
		};


		modalInstance.open();
	}

	static async moveQuestion (id, direction) {
		try {
			let question = await Request.get(`/questions/${id}`).execute();
			if (question.success) {

				$("#question" + question.data.id)[0].remove();

				if (direction == "add") {
					ClassPage.addedQuestions.push(question.data.id);
					$("#questionSetQuestions")[0].innerHTML += 
						Handlebars.compile($("#questionListQuestion")[0].innerHTML)(question.data);
				} else if (direction == "remove") {
					ClassPage.addedQuestions = ClassPage.addedQuestions.filter(el => el !== question.data.id);
					$("#searchQuestionResults")[0].innerHTML += 
						Handlebars.compile($("#questionListQuestion")[0].innerHTML)(question.data);
				}

			} else {
				console.log(question.reason);
				asm.toast(question.reason)
			}
		} catch (err) {
			console.log(err);
			asm.toast("Error in server communication");
		}
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
			M.Modal.init($("#createHomework"), {});
			M.Autocomplete.init($("#changeOwner")[0], {limit: 10});
			M.CharacterCounter.init($(".count"), {});
			
			$("#createNewClass")[0].addEventListener("click", ClassPage.createNewClass);

			ClassPage.addedQuestions = [];

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