import Chartist from "Chartist";
import React, {Component} from "react";
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

import AnimatedNumber from "./animated_number.js";
import StarAnimation from "./star_animation.js";
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default class RhythmStatisticView extends Component {

  propTypes: {
    statisticService: React.PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
  }

  getHumanReadableTime(milliseconds) {
    const seconds = milliseconds / 1000;
    return [
      {
        amount: Math.floor(seconds / 31536000),
        unit: "y"
      },
      {
        amount: Math.floor((seconds % 31536000) / 86400),
        unit: "d"
      },
      {
        amount: Math.floor(((seconds % 31536000) % 86400) / 3600),
        unit: "h"
      },
      {
        amount: Math.floor((((seconds % 31536000) % 86400) % 3600) / 60),
        unit: "m"
      },
      {
        amount: (((seconds % 31536000) % 86400) % 3600) % 60,
        unit: "s"
      },
    ].filter((el) => el.amount !== 0)
     .map((el) => `${Math.ceil(el.amount)} ${el.unit}`)
     .join(" ");
  }

  componentDidMount() {
    this.refreshFunction = this.forceUpdate.bind(this);
    this.props.statisticService.on("update", this.refreshFunction);
    this.drawDiagram();
  }

  componentDidUpdate() {
    this.drawDiagram();
  }

  componentWillUnmount() {
    this.props.statisticService.off("update", this.refreshFunction);
  }

  render() {
    const statistics = this.props.statisticService;
    if (statistics.getSuccessCount() === 0) {
      return <div />;
    }

    return (
      <div className="graph-stats content-box">
        <div ref="chart" className="semi-transparent ct-chart ct-major-eleventh"></div>
        <div className="row around-xs">
          <div className="col-xs">
            <OverlayTrigger placement="top" overlay={<Tooltip id="avgTime">Your current score</Tooltip>}>
              <span className="stat-detail">
                <StarAnimation number={statistics.getCurrentScore()} />
                <AnimatedNumber number={statistics.getCurrentScore()} />
              </span>
            </OverlayTrigger>
          </div>
          <div className="col-xs">
            <OverlayTrigger placement="top" overlay={<Tooltip id="avgTime">Total time you played rhythms</Tooltip>}>
              <span className="stat-detail">
                <i className="fa fa-clock-o"></i>
                <AnimatedNumber number={statistics.getTotalRhythmTime()} formatter={this.getHumanReadableTime} />
              </span>
            </OverlayTrigger>
          </div>
          <div className="col-xs">
            <OverlayTrigger placement="top" overlay={<Tooltip id="playedChordsAndNotes">Played bars / played beats</Tooltip>}>
              <span className="stat-detail">
                <i className="fa fa-music"></i>
                <AnimatedNumber number={statistics.getTotalAmountOfRhythms()} />
                /
                <AnimatedNumber number={statistics.getTotalAmountOfBeats()} />
              </span>
            </OverlayTrigger>
          </div>
          <div className="col-xs">
            <OverlayTrigger placement="top" overlay={<Tooltip id="successRate">Success rate</Tooltip>}>
              <span className="stat-detail">
                <i className="fa fa-trophy"></i>
                <AnimatedNumber number={statistics.getSuccessRate() * 100} />
                %
              </span>
            </OverlayTrigger>
          </div>
        </div>
      </div>
    );
  }

  drawDiagram() {
    const statistics = this.props.statisticService;
    const currentScore = statistics.getCurrentScore();
    const lastScores = statistics.getLastScores(100);

    const scoreBeforeLastHundred = currentScore - _.sum(lastScores);

    const scoreDevelopmentValues = [scoreBeforeLastHundred];
    lastScores.forEach((el) => {
      scoreDevelopmentValues.push(el + scoreDevelopmentValues.slice(-1)[0]);
    });

    const data = {
      labels: [],
      series: [scoreDevelopmentValues]
    };

    const options = {
      showPoint: false,
      lineSmooth: false,
      axisX: {
        showGrid: false,
        showLabel: false
      },
      axisY: {
        labelInterpolationFnc: function(value) {
          return value;
        }
      }
    };

    if (scoreDevelopmentValues.length > 1) {
      Chartist.Line(this.refs.chart, data, options);
    }
  }
}
