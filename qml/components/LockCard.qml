import QtQuick
import qs.Commons

// Settings card that sets, changes or clears the lock password. Its own
// file because ConfigMenu is already long, and this card owns state the
// other cards do not: two fields that must agree before anything is
// stored.
// Outer-id reads are idiomatic here; muted for the linter.
// qmllint disable unqualified

Rectangle {
    id: card
    required property color foreground
    required property string fontFamily
    required property color accent
    required property color urgent
    required property bool passwordSet
    required property bool hintMode
    required property var hintItems
    // ConfigMenu owns the registry; the tags come in already resolved.
    required property string fieldTag
    required property string confirmTag
    required property string saveTag
    required property string removeTag

    signal passwordChosen(string password)
    signal passwordCleared

    readonly property bool editing: newInput.activeFocus || confirmInput.activeFocus
    property string error: ""

    function submit() {
        if (newInput.text.length === 0) {
            card.error = "Enter a password first";
            return;
        }
        if (newInput.text !== confirmInput.text) {
            card.error = "The two entries do not match";
            return;
        }
        var chosen = newInput.text;
        card.clearFields();
        card.passwordChosen(chosen);
    }

    function clearFields() {
        newInput.text = "";
        confirmInput.text = "";
        card.error = "";
    }

    function focusField() {
        newInput.forceActiveFocus();
    }

    function focusConfirm() {
        confirmInput.forceActiveFocus();
    }

    width: parent.width
    height: lockBody.implicitHeight + Style.space(24)
    radius: Style.space(8)
    color: Qt.rgba(card.foreground.r, card.foreground.g, card.foreground.b, 0.05)

    Column {
        id: lockBody
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.margins: Style.space(12)
        spacing: Style.space(10)

        Text {
            text: "SETTINGS LOCK"
            color: card.foreground
            opacity: 0.45
            font.family: card.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1.5
        }

        Column {
            width: parent.width
            spacing: Style.space(2)

            Text {
                text: card.passwordSet ? "Change the password" : "Ask for a password"
                color: card.foreground
                opacity: 0.75
                font.family: card.fontFamily
                font.pixelSize: Style.font.bodySmall
                width: parent.width
                elide: Text.ElideRight
            }

            Text {
                text: card.passwordSet ? "Settings stay locked until it is entered; the panel itself stays open" : "A pause between the impulse and a raised limit — not a lock a shell cannot open"
                color: card.foreground
                opacity: 0.45
                font.family: card.fontFamily
                font.pixelSize: Style.font.caption
                width: parent.width
                wrapMode: Text.WordWrap
            }
        }

        Rectangle {
            width: parent.width
            height: newInput.implicitHeight + Style.space(14)
            radius: Style.space(6)
            color: "transparent"
            border.color: newInput.activeFocus ? card.accent : Qt.rgba(card.foreground.r, card.foreground.g, card.foreground.b, 0.25)
            border.width: newInput.activeFocus ? 2 : 1

            TextInput {
                id: newInput
                anchors.fill: parent
                KeyNavigation.tab: confirmInput
                leftPadding: Style.space(8)
                rightPadding: Style.space(8)
                verticalAlignment: TextInput.AlignVCenter
                color: card.foreground
                font.family: card.fontFamily
                font.pixelSize: Style.font.bodySmall
                echoMode: TextInput.Password
                passwordCharacter: "•"
                selectByMouse: false
                clip: true
                onTextChanged: card.error = ""
                onAccepted: confirmInput.forceActiveFocus()
            }

            Text {
                visible: newInput.text.length === 0 && !newInput.activeFocus
                text: "New password"
                color: card.foreground
                opacity: 0.35
                font.family: card.fontFamily
                font.pixelSize: Style.font.bodySmall
                anchors.left: parent.left
                anchors.leftMargin: Style.space(8)
                anchors.verticalCenter: parent.verticalCenter
            }

            HintBadge {
                label: card.fieldTag
                fontFamily: card.fontFamily
                accent: card.accent
                show: card.hintMode && card.fieldTag !== ""
                anchors.top: parent.top
                anchors.right: parent.right
            }
        }

        Row {
            width: parent.width
            spacing: Style.space(6)

            Rectangle {
                width: parent.width - saveBox.width - parent.spacing
                height: confirmInput.implicitHeight + Style.space(14)
                radius: Style.space(6)
                color: "transparent"
                border.color: confirmInput.activeFocus ? card.accent : Qt.rgba(card.foreground.r, card.foreground.g, card.foreground.b, 0.25)
                border.width: confirmInput.activeFocus ? 2 : 1

                TextInput {
                    id: confirmInput
                    anchors.fill: parent
                    KeyNavigation.backtab: newInput
                    leftPadding: Style.space(8)
                    rightPadding: Style.space(8)
                    verticalAlignment: TextInput.AlignVCenter
                    color: card.foreground
                    font.family: card.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    echoMode: TextInput.Password
                    passwordCharacter: "•"
                    selectByMouse: false
                    clip: true
                    onTextChanged: card.error = ""
                    onAccepted: card.submit()
                }

                Text {
                    visible: confirmInput.text.length === 0 && !confirmInput.activeFocus
                    text: "Repeat it"
                    color: card.foreground
                    opacity: 0.35
                    font.family: card.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    anchors.left: parent.left
                    anchors.leftMargin: Style.space(8)
                    anchors.verticalCenter: parent.verticalCenter
                }

                HintBadge {
                    label: card.confirmTag
                    fontFamily: card.fontFamily
                    accent: card.accent
                    show: card.hintMode && card.confirmTag !== ""
                    anchors.top: parent.top
                    anchors.right: parent.right
                }
            }

            Rectangle {
                id: saveBox
                width: saveLabel.implicitWidth + Style.space(20)
                height: confirmInput.implicitHeight + Style.space(14)
                radius: Style.space(6)
                color: Qt.rgba(card.accent.r, card.accent.g, card.accent.b, 0.15)
                border.color: card.accent
                border.width: 1

                Text {
                    id: saveLabel
                    text: card.passwordSet ? "CHANGE" : "LOCK"
                    color: card.accent
                    font.family: card.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: true
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: card.submit()
                }

                HintBadge {
                    label: card.saveTag
                    fontFamily: card.fontFamily
                    accent: card.accent
                    show: card.hintMode && card.saveTag !== ""
                    anchors.top: parent.top
                    anchors.right: parent.right
                }
            }
        }

        Text {
            visible: card.error !== ""
            text: card.error
            color: card.urgent
            font.family: card.fontFamily
            font.pixelSize: Style.font.caption
            width: parent.width
            wrapMode: Text.WordWrap
        }

        // Removing needs no confirmation dance: you are already past the
        // lock to be reading this, and re-locking is two fields away.
        Item {
            id: removeRow
            visible: card.passwordSet
            width: parent.width
            height: visible ? removeBox.height : 0

            Rectangle {
                id: removeBox
                width: removeLabel.implicitWidth + Style.space(20)
                height: removeLabel.implicitHeight + Style.space(12)
                radius: Style.space(6)
                color: "transparent"
                border.color: Qt.rgba(card.urgent.r, card.urgent.g, card.urgent.b, 0.5)
                border.width: 1

                Text {
                    id: removeLabel
                    text: "REMOVE LOCK"
                    color: card.urgent
                    font.family: card.fontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        card.clearFields();
                        card.passwordCleared();
                    }
                }

                HintBadge {
                    label: card.removeTag
                    fontFamily: card.fontFamily
                    accent: card.accent
                    show: card.hintMode && card.removeTag !== ""
                    anchors.top: parent.top
                    anchors.right: parent.right
                }
            }
        }
    }
}
