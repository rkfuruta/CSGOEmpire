let actions = {
    itemsGridSelector: '.items-grid',
    itemWrapperSelector: '.item__inner',
    itemPercentageSelector: 'button.link.has-tooltip',
    itemWearSelector: '.wear-value',
    chatOpenSelector: '.chat-tab--chat-open',
    color: {
        default: 'rgba(36,37,47,var(--tw-bg-opacity))',
        warning: '#4c4c00',
        display: '#003300',
        error: '#4c0000'
    },
    wear: {
        fn: 0.07,
        mw: 0.15,
        ft: 0.38,
        ww: 0.45,
        bs: 1
    },
    range: {
        fn: 0.07,
        mw: 0.08,
        ft: 0.23,
        ww: 0.07,
        bs: 0.55
    },
    wearThreshold: 75,
    priceThreshold: -6,
    config: {
        priceThreshold: ".option .price-threshold",
        wearThreshold: ".option .wear-threshold"
    },

    initialize: function() {
        this.loadConfig();
    },

    loadConfig: function() {
        let self = this;
        chrome.storage.sync.get(
            [
                "priceThreshold",
                "wearThreshold"
            ],
            function(result) {
                self.priceThreshold = result.priceThreshold;
                self.wearThreshold = result.wearThreshold;
                self.events();
            }
        );
    },

    events: function() {
        $("body").on("DOMNodeInserted", this.itemsGridSelector , this.elementCreate.bind(this));
        this.closeChat();
    },

    closeChat: function() {
        if ($(this.chatOpenSelector).length) {
            $(this.chatOpenSelector).click();
        }
    },

    checkElement: function(percentage, target) {
        let elementPercent = this.getPercentage(percentage);
        if (elementPercent !== false && elementPercent <= this.priceThreshold) {
            let elementWear = $(target).find(this.itemWearSelector).html();
            if (this.isGoodWear(elementWear)) {
                this.changeElement(target, this.color.display);
            } else {
                this.changeElement(target, this.color.warning);
            }
        }
    },

    isGoodWear: function(float) {
        if (float === undefined) {
            return false;
        }
        float = float.replace(/[^0-9.]/g, "");
        if (float <= this.wear.fn) {
            if (float <= this.getGoodWearThreshold("fn")) {
                return true;
            }
        } else if (float <= this.wear.mw) {
            if (float <= this.getGoodWearThreshold("mw")) {
                return true;
            }
        } else if (float <= this.wear.ft) {
            if (float <= this.getGoodWearThreshold("ft")) {
                return true;
            }
        } else if (float <= this.wear.ww) {
            if (float <= this.getGoodWearThreshold("ww")) {
                return true;
            }
        } else if (float <= this.wear.bs) {
            if (float <= this.getGoodWearThreshold("bs")) {
                return true;
            }
        }
        return false;
    },

    getGoodWearThreshold: function(type) {
        let base = this.wear[type];
        let baseRange = this.range[type];
        let range = (baseRange*this.wearThreshold)/100;
        return base-range;
    },

    elementCreate: function(e) {
        let percentage = $(e.target).find(this.itemPercentageSelector).html();
        this.checkElement(percentage, e.target);
    },

    elementUpdate: function(e) {
        let percentage = $(e.target).html();
        let element = $(e.target).closest(this.itemWrapperSelector);
        let elementPercent = this.getPercentage(percentage);
        if (elementPercent > this.priceThreshold) {
            $(element).css("background-color", this.color.default);
        }
    },

    getPercentage: function(percentage) {
        if (percentage === undefined) {
            return false;
        }
        let positive = (percentage.indexOf("off") === -1)? 1 : -1;
        return percentage.replace(/\D/g, "")*positive;
    },

    changeElement: function(element, color) {
        $(element).find(this.itemWrapperSelector).css("background-color", color);
        $(element).find(this.itemPercentageSelector).on("DOMSubtreeModified", this.elementUpdate.bind(this));
    }
}

$(function() {
   actions.initialize();
});