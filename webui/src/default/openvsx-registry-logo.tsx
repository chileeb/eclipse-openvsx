/********************************************************************************
 * Copyright (c) 2020 TypeFox and others
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

import * as React from 'react';

const OpenVSXLogo: React.FunctionComponent<{ className: string, prefersDarkMode: boolean }> = props => {
    return (
        <svg viewBox='0 0 1600 131' className={props.className}>
            <path
                d='M30 44.2L52.6 5H7.3zM4.6 88.5h45.3L27.2 49.4zm51 0l22.6 39.2 22.6-39.2z'
                fill='#c160ef' />
            <path
                d='M52.6 5L30 44.2h45.2zM27.2 49.4l22.7 39.1 22.6-39.1zm51 0L55.6 88.5h45.2z'
                fill='#a60ee5' />
            <text x='120' y='80' fill={props.prefersDarkMode ? '#fff' : '#000'} fontSize='80px' fontFamily='monospace'>Open VSX Registry China Proxy</text>
        </svg>
    );
};

export default OpenVSXLogo;
