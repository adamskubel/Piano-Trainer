import React, {Component} from "react";
import classNames from "classnames";
import _ from "lodash";

import RhythmChecker from "../services/rhythm_checker.js";


export default class BeatVisualization extends Component {

  propTypes: {
    settings: React.PropTypes.object.isRequired,
    currentRhythm: React.PropTypes.object.isRequired,
    beatHistory: React.PropTypes.object.isRequired,
    result: React.PropTypes.object.isRequired,
  }

  getNecessaryBeatNameFraction() {
    // without eighth and sixteenths, we only need every 4th beat name
    let necessaryNameFraction = 4;
    if (this.props.settings.eighthNotes) {
      necessaryNameFraction = 2;
    }
    if (this.props.settings.sixteenthNotes) {
      necessaryNameFraction = 1;
    }
    return necessaryNameFraction;
  }

  convertTicksToBeatNames(tickTime, tickLength) {
    const tickTimeToIndexFactor = 1/(16 / this.getNecessaryBeatNameFraction()) * 100;
    const tickIndex = tickTime / tickTimeToIndexFactor;
    const tickStepCount = tickLength / tickTimeToIndexFactor;
    const allBeatNames = ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'];

    const necessaryNameFraction = this.getNecessaryBeatNameFraction();
    const necessaryBeatNames = allBeatNames.filter((el, index) =>
      index % necessaryNameFraction === 0
    );

    const ticks = necessaryBeatNames.slice(tickIndex, tickIndex + tickStepCount);
    return <div className="row center-xs">
      {ticks.map((beatName, index) =>
        <div className="col-xs" key={index}>{beatName}</div>
      )}
    </div>;
  };

  render() {
    const barDuration = this.props.settings.barDuration;
    const conversionFactor = 100 / barDuration;

    const drawBeats = (beats, getColor, withBeatNames) => {
      let currentX = 0;
      const createBeat = (x, width, color, index) => {
        const marginLeft = x - currentX;
        let beatNamesRest = "-"; // fix for wrong rendering when bars are empty
        let beatNames = "-";
        if (withBeatNames) {
          beatNamesRest = this.convertTicksToBeatNames(currentX, x - currentX);
          beatNames = this.convertTicksToBeatNames(x, width);
        }
        currentX = x + width;

        return [
          marginLeft > 0 ?
            <div
              className="beat restBeat"
              style={{width: `${marginLeft}%`}}
              key={"spacer-${index}"}
            >{beatNamesRest}</div>
          : null,
          <div
            className={`beat ${color}-beat`}
            style={{width: `${width}%`}}
            key={index}
          >{beatNames}</div>
        ];
      };

      return beats.map((beat, index) => {
        const a = beat[0] * conversionFactor;
        const b = beat[1] * conversionFactor;
        const width = b - a;

        return _.flatten(createBeat(a, width, getColor(index), index));
      });
    };
    const expectedTimes = RhythmChecker.convertDurationsToTimes(
      this.props.currentRhythm.durations,
      barDuration
    );

    const expectedBeats = drawBeats(
      expectedTimes,
      _.constant("gray"),
      true
    );

    const actualBeats = drawBeats(this.props.beatHistory, (index) => {
      const result = this.props.result;
      if (!result) {
        return "gray";
      }
      if (result.success) {
        return "green";
      }
      if (result.reason === RhythmChecker.reasons.wrongLength) {
        return "red";
      }
      if (index < result.wrongBeat) {
        return "green";
      }
      if (index === result.wrongBeat) {
        return "red";
      }
      return "gray";
    }, false);

    const className = classNames({
      "beat-container": true,
      thin: !this.props.settings.labelBeats
    });

    return <div className={className}>
      <div className="expectedBeatBar">{expectedBeats}</div>
      <div className="actualBeatBar">{actualBeats}</div>
    </div>;
  }
}
