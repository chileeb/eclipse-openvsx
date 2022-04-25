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
import { withStyles, createStyles } from '@material-ui/styles';
import { Theme, WithStyles, Typography, MenuItem, Link } from '@material-ui/core';
import { Link as RouteLink } from 'react-router-dom';
import GitHubIcon from '@material-ui/icons/GitHub';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import ForumIcon from '@material-ui/icons/Forum';
import InfoIcon from '@material-ui/icons/Info';

const menuContentStyle = (theme: Theme) => createStyles({
    headerItem: {
        margin: theme.spacing(2.5),
        color: theme.palette.text.primary,
        textDecoration: 'none',
        fontSize: '1.1rem',
        fontFamily: theme.typography.fontFamily,
        fontWeight: theme.typography.fontWeightLight,
        letterSpacing: 1,
        '&:hover': {
            color: theme.palette.secondary.main,
            textDecoration: 'none'
        }
    },
    menuItem: {
        cursor: 'auto',
        '&>a': {
            textDecoration: 'none'
        }
    },
    itemIcon: {
        marginRight: theme.spacing(1),
        width: '16px',
        height: '16px',
    },
    alignVertically: {
        display: 'flex',
        alignItems: 'center'
    }
});


//-------------------- Mobile View --------------------//

export class MobileMenuContentComponent extends React.Component<WithStyles<typeof menuContentStyle>> {
    render(): React.ReactElement {
        const classes = this.props.classes;
        return <React.Fragment>
            <MenuItem className={classes.menuItem}>
                <Link target='_blank' href='https://github.com/eclipse/openvsx'>
                    <Typography variant='body2' color='textPrimary' className={classes.alignVertically}>
                        <GitHubIcon className={classes.itemIcon} />
                        源代码
                    </Typography>
                </Link>
            </MenuItem>
            <MenuItem className={classes.menuItem}>
                <Link href='https://github.com/eclipse/openvsx/wiki'>
                    <Typography variant='body2' color='textPrimary' className={classes.alignVertically}>
                        <MenuBookIcon className={classes.itemIcon} />
                        文档
                    </Typography>
                </Link>
            </MenuItem>
            <MenuItem className={classes.menuItem}>
                <Link href='https://gitter.im/eclipse/openvsx'>
                    <Typography variant='body2' color='textPrimary' className={classes.alignVertically}>
                        <ForumIcon className={classes.itemIcon} />
                        社区
                    </Typography>
                </Link>
            </MenuItem>
            <MenuItem className={classes.menuItem}>
                <RouteLink to='/about'>
                    <Typography variant='body2' color='textPrimary' className={classes.alignVertically}>
                        <InfoIcon className={classes.itemIcon} />
                        关于此站
                    </Typography>
                </RouteLink>
            </MenuItem>
        </React.Fragment>;
    }
}

export const MobileMenuContent = withStyles(menuContentStyle)(MobileMenuContentComponent);


//-------------------- Default View --------------------//

export class DefaultMenuConentComponent extends React.Component<WithStyles<typeof menuContentStyle>> {
    render(): React.ReactElement {
        const classes = this.props.classes;
        return <React.Fragment>
            <Link href='https://github.com/eclipse/openvsx/wiki' className={classes.headerItem}>
                文档
            </Link>
            <Link href='https://gitter.im/eclipse/openvsx' className={classes.headerItem}>
                社区
            </Link>
            <RouteLink to='/about' className={classes.headerItem}>
                关于我们
            </RouteLink>
        </React.Fragment>;
    }
}

export const DefaultMenuContent = withStyles(menuContentStyle)(DefaultMenuConentComponent);
