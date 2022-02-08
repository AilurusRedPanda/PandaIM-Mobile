import {StatusBar} from 'expo-status-bar';
import React, {useState} from 'react';
import {Button, FlatList, StyleSheet, Text, TextInput, View} from 'react-native';
import EventSource from "react-native-sse";
import CookieManager from '@react-native-cookies/cookies';

const PORT = 3080;
const HOST = `http://192.168.31.215:${PORT}`;

export default function App() {

    const [longConn, setLongConn] = useState(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [msgData, setMsgData] = useState([]);

    CookieManager.get(HOST).then(cookie => {
        if (cookie.token) {
            setLoggedIn(true);
            if (!longConn) longConnect(setLongConn, setMsgData);
        }
    });

    return (
        <View style={styles.container}>
            <StatusBar translucent={false} backgroundColor={"white"}/>
            {!loggedIn
                ? <LoginPage setLoggedIn={setLoggedIn} setMsgData={setMsgData}/>
                : <ChatPage msgData={msgData}/>
            }
            <StatusBar style="auto"/>
        </View>
    );
}

function LoginPage(props) {

    const [uname, setUname] = useState("");
    const [passwd, setPasswd] = useState("");

    return (
        <View>
            <StatusBar translucent={false} backgroundColor={"white"}/>
            <View
                style={styles.subContainer}>
                <Text>Username:</Text>
                <TextInput
                    style={styles.unameInput}
                    onChangeText={text => {
                        if (text !== "") setUname(text);
                    }}
                />
            </View>

            <View
                style={styles.subContainer}>
                <Text>Password:</Text>
                <TextInput
                    style={styles.unameInput}
                    secureTextEntry={true}
                    onChangeText={text => {
                        if (text !== "") setPasswd(text);
                    }}
                />
            </View>

            <Button
                title={"Login"}
                style={styles.loginBtn}
                onPress={() => login(uname, passwd, props.setMsgData, props.setLoggedIn)}
            >
            </Button>
        </View>
    );
}

function ChatPage(props) {

    const [msg, setMsg] = useState("");
    const [inputValue, setInputValue] = useState("");

    return (
        <View>
            <StatusBar translucent={false} backgroundColor={"white"}/>
            <FlatList
                style={styles.list}
                data={props.msgData}
                renderItem={({item}) => <Text>{item.text}</Text>}
                keyExtractor={(item, index) => index.toString()}
                inverted={true}
            />

            <View
                style={styles.subContainer}>
                <TextInput
                    value={inputValue}
                    style={styles.unameInput}
                    onChangeText={text => {
                        if (text !== "") setMsg(text);
                        setInputValue(text);
                    }}
                />
            </View>

            <Button
                title={"Send"}
                style={styles.loginBtn}
                onPress={async () => {
                    if (msg !== "") await sendMsg(msg);
                    setInputValue("");
                    setMsg("");
                }}
            >
            </Button>
        </View>
    );
}

function setCookie(token) {
    CookieManager.set(HOST, {
        name: "token",
        value: token,
    });
}

function loginReqConfig(uname, passwd) {
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            uname,
            passwd,
        }),
    };
}

async function sendMsgReqConfig(msg) {
    let date = new Date().valueOf();
    console.log(msg);
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            time: date,
            msg: msg,
        }),
    };
}

function showAllMsgs(res, setMsgData) {
    let msgs = [];
    let add0 = num => (num >= 10) ? num : `0${num}`;

    console.clear();
    console.log(res);
    res.forEach(item => {
        let {uname, time, msg} = item;
        let date = new Date(time);
        let dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${add0(date.getHours())}:${add0(date.getMinutes())}:${add0(date.getSeconds())}`;
        console.log(`${uname} ${dateStr}\n${msg}`);
        msgs.push({text: `${uname} ${dateStr}\n${msg}`});
    });
    setMsgData(msgs.reverse());
}

function longConnect(setLongConn, setMsgData) {
    let evtSrc = new EventSource(`${HOST}/longConnect?client=rn`);
    setLongConn(evtSrc);
    evtSrc.addEventListener("message", event => {
        showAllMsgs(JSON.parse(event.data), setMsgData);
    });
}


async function login(uname, passwd, setMsgData, setLoggedIn) {
    var res = await (await fetch(`${HOST}/login`, loginReqConfig(uname, passwd))).json();
    console.log(res);
    if (res.success) {
        setCookie(res.token);
        setLoggedIn(true);
        longConnect(setMsgData);
        console.log("You've successfully logged in!");
    }
}

async function sendMsg(msg) {
    console.log(msg);
    await fetch(`${HOST}/msg`, await sendMsgReqConfig(msg));
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },

    subContainer: {
        flexDirection: "row",
    },

    unameInput: {
        height: 40,
        width: 320,
        borderColor: 'gray',
        borderWidth: 1,
    },

    loginBtn: {
        height: 40,
        width: 100,
        backgroundColor: "grey",
        alignItems: 'center',
        justifyContent: 'center',
        color: "white",
    },

    list: {
        transform: [{scaleY: -1}],
        width: 320,
    }
});
