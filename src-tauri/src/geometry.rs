/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */
 
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl Rect {
    pub fn centered(center: f64, y: f64, width: f64, height: f64) -> Self {
        Self {
            x: (center - width / 2.0).round(),
            y: y.round(),
            width: width.round(),
            height: height.round(),
        }
    }
}

/// Match the shared renderer dimensions, including taller floating-pill states.
pub fn state_size(mode: &str, pill: bool, scale: f64) -> Option<(f64, f64)> {
    let (width, height, pill_height) = match mode {
        "collapse" => (260., 42., 52.),
        "expand" => (500., 60., 72.),
        "expand-notification" => (500., 88., 100.),
        "expand-lyrics" => (500., 42., 52.),
        "expand-lyrics-translation" => (500., 60., 72.),
        "expand-full" => (860., 150., 164.),
        "expand-settings" => (860., 400., 416.),
        _ => return None,
    };
    Some((
        (width * scale / 100.0).round(),
        ((if pill { pill_height } else { height }) * scale / 100.0).round(),
    ))
}

/// Keep backing width stable while the renderer springs between visible sizes.
pub fn backing_rect(target: Rect, backing_width: f64) -> Rect {
    let width = backing_width.max(target.width);
    Rect {
        x: (target.x - (width - target.width) / 2.0).round(),
        width,
        ..target
    }
}

pub fn menu_rect(anchor: Point, area: Rect, height: f64) -> Rect {
    let width = 272.0_f64.min(area.width);
    let height = height.min(area.height);
    let x = if anchor.x + width <= area.x + area.width {
        anchor.x
    } else {
        anchor.x - width
    };
    let y = if anchor.y + height <= area.y + area.height {
        anchor.y
    } else {
        anchor.y - height
    };
    Rect {
        x: x.clamp(area.x, area.x + area.width - width),
        y: y.clamp(area.y, area.y + area.height - height),
        width,
        height,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pill_and_scale_match_renderer_contract() {
        assert_eq!(
            state_size("expand-settings", true, 125.),
            Some((1075., 520.))
        );
        assert_eq!(state_size("collapse", false, 50.), Some((130., 21.)));
        assert_eq!(state_size("untrusted", false, 100.), None);
    }
    #[test]
    fn shrinking_retains_center_and_backing_width() {
        let target = Rect::centered(-960., 0., 260., 42.);
        let backing = backing_rect(target, 860.);
        assert_eq!(backing.x + backing.width / 2., -960.);
        assert_eq!((backing.width - target.width) / 2., 300.);
    }
    #[test]
    fn tray_flips_and_clamps_on_negative_origin_display() {
        let area = Rect {
            x: -1920.,
            y: -1080.,
            width: 1920.,
            height: 1040.,
        };
        let rect = menu_rect(Point { x: -5., y: -45. }, area, 373.);
        assert_eq!(
            rect,
            Rect {
                x: -277.,
                y: -418.,
                width: 272.,
                height: 373.
            }
        );
    }
}
