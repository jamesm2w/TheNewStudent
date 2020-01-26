var $ = selector => document.querySelectorAll(selector);

var asm = new ApplicationStateManager();

document.addEventListener("DOMContentLoaded", () => {
	M.Sidenav.init($(".sidenav"), {});
	M.Tabs.init($(".tabs"), {});
	M.Dropdown.init($(".dropdown-trigger"), {});
    M.Modal.init($(".modal"), {});
    M.Datepicker.init($(".datepicker"), {format: "dd mmm yyyy", container: document.querySelector("body"), showClearBtn: true});
});

