let actions = {
    itemsGridSelector: '.items-grid',
    itemWrapperSelector: '.item__inner',
    itemPercentageSelector: 'button.link.has-tooltip',
    itemWearSelector: '.wear-value',
    chatOpenSelector: '.chat-tab--chat-open',
    breakline: "&#10;",
    item: {
        selectors: {
            wear_type: ".item__quality span:first",
            skin: ".item__name",
            price: ".item__price span",

        },
        lowestPrice: "emp-ext-lowest-price",
        lowestPricePercentage: "emp-ext-lowest-price-percentage",
        cacheTime: "emp-ext-cache-time"
    },
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
    storage: {
        itemPrice: "session_price"
    },
    wearThreshold: 75,
    priceThreshold: -6,
    cacheLifeTime: 3600000,
    token: null,
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
                "wearThreshold",
                "apiToken",
                "cacheLifeTime"
            ],
            function(result) {
                self.priceThreshold = result.priceThreshold;
                self.wearThreshold = result.wearThreshold;
                self.token = result.apiToken;
                self.cacheLifeTime = result.cacheLifeTime;
                self.events();
            }
        );
    },

    events: function() {
        $("body").on("DOMNodeInserted", this.itemsGridSelector , this.elementCreate.bind(this));
        this.closeChat();
    },

    closeChat: function() {
        let chatInterval = setInterval(() => {
            if ($(this.chatOpenSelector).length) {
                $(this.chatOpenSelector).click();
                clearInterval(chatInterval);
            }
        })

    },

    checkElement: function(percentage, target) {
        let elementPercent = this.getPercentage(percentage);
        if (elementPercent !== false && elementPercent <= this.priceThreshold) {
            let elementWear = $(target).find(this.itemWearSelector).html();
            if (this.isGoodWear(elementWear)) {
                this.changeElement(target, this.color.display, true);
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

    changeElement: function(element, color, showStatus = false) {
        $(element).find(this.itemWrapperSelector).css("background-color", color);
        $(element).find(this.itemPercentageSelector).on("DOMSubtreeModified", this.elementUpdate.bind(this));
        if (showStatus) {
            this.showStatus(element);
        }
    },

    showStatus: function(element) {
        this.setLowestPrice(element);
    },

    setLowestPrice: function(element) {
        let name = this.getItemName(element);
        chrome.storage.local.get(name, (result) => {
            if (!result.hasOwnProperty(name)) {
                if (!this.token) {
                    return;
                }
                this.checkPrice(name, element);
            } else {
                let now = Date.now();
                let cacheTime = now - result[name].time;
                if (cacheTime >= this.cacheLifeTime) {
                    console.log(`Refresh price cache ${cacheTime} - ${name}`);
                    this.checkPrice(name, element);
                } else if (result[name].hasOwnProperty("value")) {
                    console.log(`Storage: ${name} - ${result[name].value} - ${this.msToTime(cacheTime)}`);
                    this.displayCacheTime(element, cacheTime);
                    this.displayPrice(element, result[name].value, result[name].list);
                }
            }
        });
    },

    displayCacheTime: function(element, cacheTime) {
        let cacheTimeSelector = $(element).find(`.${this.item.cacheTime}`);
        if (cacheTimeSelector.length) {
            cacheTimeSelector.html(this.msToTime(cacheTime));
        } else {
            $(element).find(this.item.selectors.skin).append(`<span style="padding-left: 5px; font-size: .625rem;" class="${this.item.cacheTime}">${this.msToTime(cacheTime)}</span>`)
        }
    },

    checkPrice: function(name, element) {
        this.callPriceApi(name).done((response) => {
            if (response && response.hasOwnProperty("data") && response.data.length && response.data[0].hasOwnProperty("market_value")) {
                let price = response.data[0].market_value;
                let list = [];
                response.data.forEach((item) => {
                    list.push(item.market_value);
                })
                console.log(`API: ${name} - ${price}`);
                this.savePriceToStorage(name, price, list);
                this.displayPrice(element, price, list);
            }
        });
    },

    displayPrice: function(element, value, list) {
        let priceSelector = $(element).find(this.item.selectors.price);
        let lowestSelector = $(element).find(`.${this.item.lowestPrice}`);
        let price = value/100;
        if (lowestSelector.length) {
            lowestSelector.html(price);
        } else {
            let color = "";
            let off = "";
            let currentPrice = this.getItemPrice(element);
            if (currentPrice === value) {
                color = "color: red;";
                off = `(${(((list[1]/currentPrice) - 1)*100).toFixed(2)}%)`;
            }
            $(priceSelector).append(`
                <span style="padding-left: 10px; ${color}" title="${this.formatList(list, element)}" class="${this.item.lowestPrice}">${price}</span>
                <span style="${color}" class="${this.item.lowestPricePercentage}">${off}</span>
            `);
        }
    },

    formatList: function(list, element) {
        let formated = [];
        let currentPrice = this.getItemPrice(element)
        list.forEach((value) => {
            formated.push(`${value/100} (${(((value/currentPrice) - 1)*100).toFixed(2)}%)`);
        })
        return formated.join(this.breakline);
    },

    savePriceToStorage: function(name, price, list) {
        chrome.storage.local.set({ [name] : {
                value: price,
                list: list,
                time: Date.now()
            }
        })
    },

    callPriceApi: function(name) {
        if (!this.token) {
            return;
        }
        return $.ajax({
            url: `https://csgoempire.com/api/v2/trading/items?per_page=10&page=1&order=market_value&sort=asc&commodity=no&search=${encodeURI(name)}`,
            header: `Bearer ${this.token}`
        });
    },

    getItemName: function(element) {
        let skin = $(element).find(this.item.selectors.skin).html().trim();
        let wear_type = $(element).find(`${this.item.selectors.wear_type}:first`).html().trim();
        let name = $(element).find(this.item.selectors.skin).parent().find("div:first").html().trim();
        return (name === skin)? `${name}` :`${name} ${skin} ${wear_type}`;
    },

    getItemPrice: function(element) {
        let price = $(element).find(`${this.item.selectors.price} div`).html().trim();
        return parseInt(price.replace(/\D/g, ''));
    },

    msToTime: function(duration) {
        let milliseconds = Math.floor((duration % 1000) / 100),
            seconds = Math.floor((duration / 1000) % 60),
            minutes = Math.floor((duration / (1000 * 60)) % 60),
            hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
    }
}

$(function() {
   actions.initialize();
});