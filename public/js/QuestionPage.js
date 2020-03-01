class QuestionPage {
	constructor(asm) {
		this.stateManager = asm;
		this.route = new Route("questions", "questions.html", QuestionPage.afterPageShow, QuestionPage.onPageShow);

		this.activeQuestionSet = "";
		this.currentQuestionIndex = 0;

		this.setData = {};
		this.questions = {}
	}

	async loadQuestions () {
		try {
			let result = await Request.get(`/questionSet/${this.activeQuestionSet}`).execute();
			console.log("Questions");
			console.log(result);
			if (result.success != true) { throw result.reason;}
			else {
				this.questions = result.data;

				if (result.data == []) {
					this.stateManager.toast("No questions in this set?")
				}
			}
		} catch (err) {
			console.log(err);
			this.stateManager.toast("Error in server communication");
		}
	}

	async nextQuestion () {
		this.currentQuestionIndex++;

		let currentQuestion = this.questions[this.currentQuestionIndex - 1];
		
		await this.loadDataAndBar();

		if (typeof currentQuestion == "undefined" && this.currentQuestionIndex >= this.setData.maxQuestions) {
			this.stateManager.toast("Completed Question Set");
			$("#questionArea")[0].innerHTML = Handlebars.compile($("#finalScreenTemplate")[0].innerHTML)(this.setData);
			$("#feedbackBox")[0].innerHTML = "";
		
			return;
		}

		if (currentQuestion.options) {
			currentQuestion.multipleChoice = true;
			currentQuestion.options = JSON.parse(currentQuestion.options);
		}

		switch (currentQuestion.type) {
			case 0:
				currentQuestion.shortAnswer = true;
				break;
			case 1:
				currentQuestion.multipleChoice = true;
				break;
			case 2:
				currentQuestion.latextInput = true;
				break;
			case 3:
				currentQuestion.longAnswer = true;
				break;
			default:
				break;
		}

		currentQuestion.number = this.currentQuestionIndex;

		console.log("Current Question:")
		console.log(currentQuestion);
		$("#feedbackBox")[0].innerHTML = "";

		$("#questionArea")[0].innerHTML = Handlebars.compile($("#questionTemplate")[0].innerHTML)
			(currentQuestion);

		if (currentQuestion.latextInput) {
			let mathField = MQ.MathField($("#math-field")[0], {
				"spaceBehavesLikeTab": true,
				"handlers": {
					"edit": () => {
						$("#math-field")[0].value = mathField.latex(); 
					}
				}
			});
		}

		$("#helpbutton")[0].onclick = (e) => {this.askForHelp(currentQuestion);}

		$("#submitanswer")[0].onclick = (e) => {this.checkAnswerToQuestion(currentQuestion)};
	}

	async loadDataAndBar () {
		try {
			let result = await Request.get(`/profile/questionSet/progress?id=${this.activeQuestionSet}`).execute();
			if (result.success) {
				this.setData = result.data
				
				this.currentQuestionIndex = (this.currentQuestionIndex > this.setData.questionNum) ?
					 this.currentQuestionIndex : this.setData.questionNum;

				this.setData.percentCorrect = Math.round((this.setData.correctQuestions / this.setData.maxQuestions) * 100);
				this.setData.printQuestionNum = this.setData.questionNum;
				$("#questionBar")[0].innerHTML = Handlebars.compile($("#questionBarTemplate")[0].innerHTML)(this.setData);

			} else {
				this.stateManager.toast(result.reason);
			}
		} catch (err) {
			console.log(err);
			this.stateManager.toast("Error in Server communication");
		}
	}

	async askForHelp (question) {
		let answer = $("#questionAnswer")[0] || $("#math-field")[0] || $("input[name='questionOptions']:checked")[0];

		if (answer.value != "") {
			Request.post(`/profile/questions/${this.activeQuestionSet}/help`, 
				{"id": question.id, "answer": answer.value}
			).execute().then(result => {
				if (result.success) {
					this.stateManager.toast("Request Sent To Teacher");
					$("#helpbutton")[0].onclick = () => {return false;};
					$("#helpbutton")[0].classList.add("grey-text", "text-darken-3");
				} else {
					console.log(result);
					this.stateManager.toast(result.reason);
				}
			}).catch(err => {
				console.log(err);
				this.stateManager.toast("Error in server communication");
			});
		}

	}

	async checkAnswerToQuestion (question) {
		let answer = $("#questionAnswer")[0] || $("#math-field")[0] || $("input[name='questionOptions']:checked")[0];

		if (answer.value != "") {
			Request.post(`/profile/questions/${this.activeQuestionSet}/answer`, 
				{"id": question.id, "answer": answer.value}
			).execute().then(result => {

				console.log(result);
				
				if (result.success) {
					answer.setAttribute("disabled", true);
					$("input[name='questionOptions']").forEach(el => {
						el.setAttribute("disabled", true);
					});

					$("#submitanswer")[0].onclick = () => {return false;};
					$("#submitanswer")[0].classList.add("grey-text", "text-darken-3")

					this.loadDataAndBar();

					if (result.result == "correct") {
						$("#feedbackBox")[0].innerHTML = Handlebars.compile($("#correctAnswerTemplate")[0].innerHTML)(
							result
							);
					} else if (result.result == "incorrect") {
						$("#feedbackBox")[0].innerHTML = Handlebars.compile($("#incorrectAnswerTemplate")[0].innerHTML)(
							result
							);
					} else if (result.result == "inconclusive") {
						$("#feedbackBox")[0].innerHTML = Handlebars.compile($("#indeterminateAnswerTemplate")[0].innerHTML)(
							result
							);
					}

					//this.loadDataAndBar();

				} else {
					this.stateManager.toast(result.reason);
				}					

			}).catch(err => {
				console.log(err);
				this.stateManager.toast("Error in server communication");
			});
		} else {
			this.stateManager.toast("Enter an answer");
		}
	}

	static onPageShow () {
		if (!this.stateManager.loggedIn) {
			this.stateManager.toast("You must be logged in to view this page");
			return false;
		}

		return true;
	}

	static async afterPageShow () {
		let page = asm.questionPage;

		try {

			

			if (typeof page.setData == "unedefined") {
				throw "Missing question set data";
			}

			$("#questionContainer")[0].innerHTML = Handlebars.compile($("#answerQuestionTemplate")[0].innerHTML)();

			await page.loadDataAndBar();
			await page.loadQuestions();

			page.nextQuestion();

		} catch (err) {
			console.log(err);
			asm.toast("Error in creating page");
			window.location.hash = "profile";
		}
	}

	static switchToAnswerQuestion (qSetId) {
		window.location.hash = "questions";
		asm.questionPage.activeQuestionSet = qSetId;
		asm.questionPage.currentQuestionIndex = 0;
	}
	
}