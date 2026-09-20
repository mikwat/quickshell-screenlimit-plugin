import QtQuick
import qs.Commons
import "../../js/Password.js" as Password

// Settings lock: the config drawer shows this instead of the menu until
// the password lands. Verification belongs to the panel, which owns the
// stored record; this only collects the attempt and reports the wait.
// Outer-id reads are idiomatic here; muted for the linter.
// qmllint disable unqualified

Item {
    id: gate
    required property color foreground
    required property string fontFamily
    required property color accent
    required property color urgent
    // Set by the panel after a wrong attempt: when to accept the next
    // one (epoch ms), and what to say meanwhile.
    required property double retryAt
    required property string message

    // The panel binds its key catcher to this, so typed characters reach
    // the field instead of triggering panel shortcuts.
    readonly property bool editing: passwordInput.activeFocus

    signal submitted(string password)

    // Ticks only while a wait is running; nothing spins once it expires.
    property double now: Date.now()
    readonly property int secondsLeft: Password.lockoutSecondsLeft(gate.retryAt, gate.now)
    readonly property bool waiting: gate.secondsLeft > 0

    function clear() {
        passwordInput.text = "";
    }

    function focusInput() {
        passwordInput.forceActiveFocus();
    }

    function submit() {
        if (gate.waiting || passwordInput.text.length === 0)
            return;
        var attempt = passwordInput.text;
        passwordInput.text = "";
        gate.submitted(attempt);
    }

    Timer {
        interval: 250
        repeat: true
        running: gate.retryAt > gate.now
        onTriggered: gate.now = Date.now()
    }

    implicitHeight: body.implicitHeight

    Column {
        id: body
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: Style.space(12)

        Text {
            text: ""
            color: gate.accent
            font.family: gate.fontFamily
            font.pixelSize: Style.fontPx(2.0)
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
        }

        Text {
            text: "Settings are locked"
            color: gate.foreground
            font.family: gate.fontFamily
            font.pixelSize: Style.font.subtitle
            font.bold: true
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
        }

        Text {
            text: "Enter your password to change the limit, the alarm or your history."
            color: gate.foreground
            opacity: 0.5
            font.family: gate.fontFamily
            font.pixelSize: Style.font.caption
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
        }

        Item {
            width: parent.width
            height: Style.space(10)
        }

        Rectangle {
            width: parent.width
            height: passwordInput.implicitHeight + Style.space(14)
            radius: Style.space(6)
            color: "transparent"
            opacity: gate.waiting ? 0.4 : 1.0
            border.color: passwordInput.activeFocus ? gate.accent : Qt.rgba(gate.foreground.r, gate.foreground.g, gate.foreground.b, 0.25)
            border.width: passwordInput.activeFocus ? 2 : 1

            TextInput {
                id: passwordInput
                anchors.fill: parent
                enabled: !gate.waiting
                leftPadding: Style.space(10)
                rightPadding: Style.space(10)
                verticalAlignment: TextInput.AlignVCenter
                color: gate.foreground
                font.family: gate.fontFamily
                font.pixelSize: Style.font.bodySmall
                // Never echoed, and no copy route out of the field.
                echoMode: TextInput.Password
                passwordCharacter: "•"
                selectByMouse: false
                clip: true
                onAccepted: gate.submit()
            }
        }

        Item {
            id: unlockRow
            width: parent.width
            height: unlockBox.height

            Rectangle {
                id: unlockBox
                width: unlockLabel.implicitWidth + Style.space(24)
                height: unlockLabel.implicitHeight + Style.space(14)
                radius: Style.space(6)
                anchors.horizontalCenter: parent.horizontalCenter
                color: gate.waiting ? "transparent" : Qt.rgba(gate.accent.r, gate.accent.g, gate.accent.b, 0.15)
                border.color: gate.waiting ? Qt.rgba(gate.foreground.r, gate.foreground.g, gate.foreground.b, 0.25) : gate.accent
                border.width: 1

                Text {
                    id: unlockLabel
                    text: gate.waiting ? "WAIT " + gate.secondsLeft + "s" : "UNLOCK"
                    color: gate.waiting ? Qt.rgba(gate.foreground.r, gate.foreground.g, gate.foreground.b, 0.5) : gate.accent
                    font.family: gate.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: true
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    enabled: !gate.waiting
                    cursorShape: Qt.PointingHandCursor
                    onClicked: gate.submit()
                }
            }
        }

        Text {
            visible: gate.message !== ""
            text: gate.message
            color: gate.urgent
            font.family: gate.fontFamily
            font.pixelSize: Style.font.caption
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
        }

        Item {
            width: parent.width
            height: Style.space(6)
        }

        // Says the quiet part out loud: this is a speed bump, and the
        // way back in if the password is gone is the same way out.
        Text {
            text: "Forgotten it? Remove \"settingsPassword\" from shell.json — which is also all this lock can ever be."
            color: gate.foreground
            opacity: 0.35
            font.family: gate.fontFamily
            font.pixelSize: Style.font.caption
            width: parent.width
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.WordWrap
        }
    }
}
