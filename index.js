process.env["NTBA_FIX_319"] = 1;
const TelegramBot = require('node-telegram-bot-api');
// const GreenSMS = require("greensms");
// const client = new GreenSMS({ user: "saydullin", pass: "2020Said" });
// client.sms.send({ from: 'saydullin', to: "998935115703", txt: "checking" });

const TOKEN = '1431760664:AAFEaCtStz7uoI3HimyjWCnq5aEEOFtZXwo';

const bot = new TelegramBot(TOKEN, { polling: true });

const state = {
    active: 'start',
    auth_type: 'none',
    user: {
        name: '',
        number: ''
    }
}

const com = [
    '/start',
    '/support',
    '/leave'
]

const getButton = (arr) => {
    const allButtons = [];
    arr.forEach((iarr) => {
        const buttons = [];
        iarr.forEach((i) => {
            if (i[1] === 'contact') {
                butt = {
                    text: i[0],
                    request_contact: true
                }
            } else if (i[1] === 'location') {
                butt = {
                    text: i[0],
                    request_location: true
                }
            } else {
                butt = {
                    text: i[0],
                    callback_data: i[1]
                }
            }

            buttons.push(butt);
        })
        allButtons.push(buttons)
    })
    return allButtons;

}

const onStart = (id) => {
    bot.sendMessage(id, 'Добро Пожаловать в главное меню', {
        reply_markup: {
            inline_keyboard:
                state.auth_type === 'done' ?
                    getButton([
                        [["Чат с оператором", "chat"], ["Авиабилеты", "tickets"]]
                    ])
                    :
                    getButton([
                        [["Авторизация", "auth"]],
                        [["Чат с оператором", "chat"], ["Авиабилеты", "tickets"]]
                    ])
        }
    });
}

const onSupport = (id) => {
    state.active = 'chat';
    return bot.sendMessage(id, "Добро Пожаловать в Чат!\n\n4 Оператора свободно...\n\nВведите своё сообщение, оно будет доставлено оператору.\nОн ответит вам в течении 20 секунд.", {
        reply_markup: {
            inline_keyboard: getButton([
                [["Отмена", "cancel"]]
            ])
        }
    })
}

const onAuth = (id, msg) => {
    state.active = 'auth';
    if (state.auth_type === 'none') {
        state.auth_type = 'get_number';
        return bot.sendMessage(id, 'Для успешной авторизации, поделитесь своим номером телефона:', {
            reply_markup: {
                keyboard: getButton([
                    [["Поделиться номером телефона", "contact"]]
                ])
            }
        })
    }
    if (state.auth_type === 'get_number') {
        if (msg.contact && msg.contact.phone_number) {
            state.auth_type = 'get_code';
            state.user.number = msg.contact.phone_number;
            return bot.sendMessage(id, 'Теперь введите код, отправленный на номер телефона', {
                reply_markup: {
                    remove_keyboard: true
                }
            });
        }
        return bot.sendMessage(id, 'Нажмите пожалуйста на кнопку, чтобы поделиться номером телефона');
    }
    if (state.auth_type === 'get_code') {
        if (msg.text === '8') {
            state.auth_type = 'done';
            return bot.sendMessage(id, 'Отлично! Вы авторизовaлись!', {
                reply_markup: {
                    inline_keyboard: getButton([
                        [["Чат с оператором", "chat"], ["Авиабилеты", "tickets"]]
                    ])
                }
            });
        }
        return bot.sendMessage(id, 'Неверный код! Введите еще раз');
    }
    if (state.auth_type === 'done') {
        return bot.sendMessage(id, 'Вы уже авторизованы.', {
            reply_markup: {
                inline_keyboard: getButton([
                    [["Отмена", "cancel"]]
                ])
            }
        });
    }
}

const on404 = (msg) => {
    const { chat: { id } } = msg;
    bot.sendMessage(id, "Команда не распознана.\nНажмите на /start.");
}

bot.onText(/\/start/, msg => {
    const { chat: { id } } = msg;
    onStart(id, msg);
});

bot.onText(/\/support/, msg => {
    const { chat: { id } } = msg;
    onSupport(id);
});

bot.onText(/\/cancel/, msg => {
    const { chat: { id } } = msg;
    onStart(id);
    state.active = 'start';
});

const sendPhoto = (id, msg) => {
    const { photo } = msg;
    if (photo && photo[1].file_id) {
        bot.sendPhoto(id, photo[1].file_id)
    }
}

const onChat = (id) => {
    bot.sendMessage(id, "Доставлено!");
}

bot.on('message', (msg) => {
    const { text, chat: { id } } = msg;
    if (com.includes(text)) {
        return false;
    }
    if (msg.photo) {
        return sendPhoto(id, msg)
    }
    if (state.active === 'chat') {
        return onChat(id);
    }
    if (state.active === 'auth') {
        return onAuth(id, msg);
    }
    on404(msg);
})

bot.on('callback_query', msg => {
    const { data, message: { message_id, chat: { id } } } = msg;

    switch (data) {
        case 'chat':
            bot.deleteMessage(id, message_id)
            return onSupport(id);
        case 'tickets':
            bot.deleteMessage(id, message_id)
            state.active = 'tickets';
            return bot.sendMessage(id, 'Авиабилетов нет.', {
                reply_markup: {
                    inline_keyboard: getButton([
                        [["Отмена", "cancel"]]
                    ])
                }
            })
        case 'cancel':
            bot.deleteMessage(id, message_id)
            return onStart(id);
        case 'auth':
            return onAuth(id, msg);
    }
})