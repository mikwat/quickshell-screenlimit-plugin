import QtQuick
import qs.Commons

// Week-chart limit marker: a dashed rule at the daily limit, so a glance
// says which days went over it. Sits on the same scale as the bars and
// the gridlines; the axis reference already grew to fit it, so the
// visibility guard only covers a stale or absent limit.
// Outer reads are layout-parent geometry; muted file-wide like WeekTick.
// qmllint disable unqualified

Item {
    id: line
    required property double limitMs
    required property double axisMaxMs
    required property color urgent

    readonly property real dashWidth: Style.space(5)
    readonly property real dashGap: Style.space(4)
    // Dashes stop before the y-axis labels, like the gridlines.
    readonly property real trackWidth: Math.max(0, line.width - Style.space(26))

    width: parent.width
    height: 2
    // Over the bars (z 2), not behind them: an unbroken rule is what
    // makes "this day crossed it" readable at a glance.
    z: 3
    visible: line.limitMs > 0 && line.axisMaxMs > 0 && line.limitMs <= line.axisMaxMs
    // Same anchor as WeekTick: bar bottoms sit space(16) above the
    // strip's bottom edge, bar tops scale over space(64).
    y: line.axisMaxMs > 0 ? (parent.height - Style.space(16) - Style.space(64) * line.limitMs / line.axisMaxMs) : parent.height

    Row {
        anchors.left: parent.left
        anchors.verticalCenter: parent.verticalCenter
        spacing: line.dashGap

        Repeater {
            model: Math.max(0, Math.floor((line.trackWidth + line.dashGap) / (line.dashWidth + line.dashGap)))

            Rectangle {
                width: line.dashWidth
                height: line.height
                radius: height / 2
                color: line.urgent
                opacity: 0.75
            }
        }
    }
}
