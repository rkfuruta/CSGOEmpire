let popup = {
    saveButton: '.actions .save',
    loaderSelector: '.loader',
    config: {
        priceThreshold: ".option .price-threshold",
        wearThreshold: ".option .wear-threshold"
    },

    initialize: function() {
        this.loadValues();
        this.events();
    },

    loadValues: function() {
        let self = this;
        chrome.storage.sync.get(
            [
                "priceThreshold",
                "wearThreshold"
            ],
            function(result) {
                $(self.config.priceThreshold).val(result.priceThreshold);
                $(self.config.wearThreshold).val(result.wearThreshold);
            }
        );
    },

    events: function() {
        $(this.saveButton).on("click", this.save.bind(this));
    },

    save: function () {
        this.storage({
            "priceThreshold": $(this.config.priceThreshold).val(),
            "wearThreshold": $(this.config.wearThreshold).val(),
        });
    },

    storage: function(data) {
        let self = this;
        this.loader(true);
        chrome.storage.sync.set(data, function() {
            setTimeout(function() {
                self.loader(false)
            }, 1000);
        });
    },

    loader: function(show = false) {
        if (show) {
            $(this.loaderSelector).show();
        } else {
            $(this.loaderSelector).hide();
        }
    }
}

$(function() {
    popup.initialize();
});