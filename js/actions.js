let actions = {

    itemsGridSelector : ".items-grid",

    initialize: function() {
        this.events();
    },

    events: function() {
        $("body").on("DOMNodeInserted", this.itemsGridSelector , function(e) {
            e.target.style.backgroundColor = "white";
        });
    }
}

$(function() {
   actions.initialize();
});