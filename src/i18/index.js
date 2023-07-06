// Checker
import { objType } from '../util/tools';

// Lang Cache
const langs = {

    loading: false,

    default: 'en',
    selected: null,

    list: {
        en: 'English'
    },

    data: {},

};

// Refresh Lang
export function refreshLang() {
    langs.loading = true;
    global.refreshLang = refreshLang;
    return new Promise((resolve, reject) => {

        // Fix Default
        try {
            if (!langs.selected || !langs.list[langs.selected]) langs.selected = langs.default;
        } catch (err) {
            langs.loading = false; reject(err);
        }

        // Get Default Data
        fetch(`./i18/${langs.default}.json`, {
            headers: {
                'Accept': 'application/json'
            }
        }).then(res => res.json()).then(data => {
            if (objType(data, 'object')) {

                // Insert Default Items
                for (const item in data) {
                    if (typeof data[item] === 'string') langs.data[item] = data[item];
                }

                // Insert Custom Lang
                if (langs.selected !== langs.default) {
                    fetch(`./i18/${langs.selected}.json`, {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }).then(res => res.json()).then(data2 => {

                        if (objType(data2, 'object')) {

                            // Insert Items
                            for (const item in data2) {
                                if (typeof data2[item] === 'string') langs.data[item] = data2[item];
                            }

                            // Complete
                            langs.loading = false;
                            resolve(true);

                        } else {
                            langs.loading = false;
                            console.error(new Error(`[${langs.selected}] INVALID LANG JSON! THIS NEED TO BE OBJECT WITH STRINGS! USING DEFAULT LANG FOR NOW. (${langs.default})`));
                            resolve(false);
                        }

                    }).catch(err => { langs.loading = false; reject(err); });
                } else { langs.loading = false; resolve(true); }

            } else { langs.data = {}; langs.loading = false; reject(new Error(`[${langs.default}] INVALID DEFAULT LANG JSON! THIS NEED TO BE OBJECT WITH STRINGS!`)); }
        }).catch(err => { langs.loading = false; reject(err); });

    });
};

// Load Text
export function getI18(item) { return langs.data[item]; };
export function i18IsLoading() { return langs.loading; }