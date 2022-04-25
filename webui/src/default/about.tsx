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
import { Link, Typography, Container, useTheme, makeStyles } from '@material-ui/core';

const About: React.FunctionComponent = () => {
    const theme = useTheme();
    const classes = makeStyles({
        heading: {
            marginTop: theme.spacing(4)
        },
        paragraph: {
            marginTop: theme.spacing(2)
        }
    })();
    return <Container maxWidth='md'>
        <Typography variant='h4' className={classes.heading}>About This Service</Typography>
        <Typography variant='body1' className={classes.paragraph}>
            Open VSX is an open-source registry for VS Code extensions.
            It can be used by any development environment that supports such extensions.
            See <Link color='secondary' href='https://www.eclipse.org/community/eclipse_newsletter/2020/march/1.php'>this article</Link> for
            more information.
        </Typography>
        <Typography variant='body1' className={classes.paragraph}>
            This instance of Open VSX uses the default UI from
            the <Link color='secondary' href='https://www.npmjs.com/package/openvsx-webui'>openvsx-webui npm package</Link>,
            which is also included in
            the <Link color='secondary' href='https://github.com/eclipse/openvsx/packages/324117'>openvsx-webui Docker image</Link>.
        </Typography>
        <Typography variant='body1' className={classes.paragraph}>
            This site is hosted in mainland China and it is act as a proxy for open-vsx.org to speed up the extension access for developers in China. 
            All extensions are copied from open-vsx.org using GitHub action. 
            The source-code of this site and the Github Action scripts are all open sourced on our GitHub Repo.
            If you donot want your extension hosted on our site, you can create an <Link color='secondary' href='https://github.com/SmartIDE/eclipse-openvsx/issues'>issue</Link> on our GitHub. 
        </Typography>
        <Typography variant='body1' className={classes.paragraph}>
            本站点为open-vsx.org的中国大陆镜像站点，为国内开发者提供插件安装加速服务。
            本站点上托管的插件全部通过 GitHub Action 从 open-vsx.org 上复制过来；
            本站点所使用的源码以及 GitHub Action 脚本都通过 GitHub 开源提供给社区免费使用。
            如果你不希望自己的插件在我们的站点上出现，可以通过提交<Link color='secondary' href='https://github.com/SmartIDE/eclipse-openvsx/issues'> issue</Link> 与我们联系。
        </Typography>
    </Container>;
};

export default About;
