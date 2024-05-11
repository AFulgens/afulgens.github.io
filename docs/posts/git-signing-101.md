---
draft: true
date: 2023-12-01 # for the RSS plugin
categories:
  - git
  - cryptography
authors:
  - afulgens
title: Digital signatures in Git 101
description: How to do, what you get if you do, why should you digitally sign stuff in Git (and what does that even mean?)
icon: material/file-sign
#image: ...
---

# Digital signatures in Git 101

I am sure that if you look for “how to sign your commits in git” tutorials, you find countably infinite number of these.

However, I felt the need to write another one. Why? <!-- more --> Because I felt that all the guides I can find are either:

- incomplete,
- overcomplicated,
- or not extensive enough

(pick any combination of the above).

Thus, in this tutorial, I try to approach the topic in a way, which I did not see yet.

We will have a look at the [“how”,](#how-to-sign-your-git-commits-or-tags) then the [“what you get for it”,](#what-is-the-added-value-of-signing-your-commits-or-tags) then the [“why”,](#why-should-you-sign-your-commits-or-tags-at-all) then [“how you can up your game with agents or smart cards”,](#what-if-you-want-to-up-your-game-and-use-agents-or-smart-cards) and last but not least we look at the [“what does it mean”.](#actually-what-is-a-digital-signature) This way, in case you want to sign stuff in Git, you just have to read the beginning of the article; afterwards we ease our way into the more and more arcane stuff as we go along.

Let’s start, shall we?

## How to sign your git commits (or tags)

This is the easy part. First, you have to choose, how do you want to sign your commits and/or tags:

- [With SSH](#signing-stuff-with-ssh)
- [With GPG](#signing-stuff-with-gpg)
- [With S/MIME](#signing-stuff-with-smime)

### Signing stuff with SSH

SSH, as in the **s**ecure **sh**ell protocol, was originally designed for remote authentication. However, it uses public-key cryptography for a key exchange and for creating a digital signature during the authentication. Since OpenSSH version 8.0[^1] (release date 2019-04-17) the part doing the digital signatures can be used for signing arbitrary data, and compatible versions are packaged with Git for Windows since version 2.33.1[^2] (release date 2021-10-14).

In case you are already using SSH for authentication towards your Git server, you may easily achieve signing all your commits and tags with the same keys with negligible, one-time, setup overhead. According to the authors of SSH itself, this is fine[^1]. I don’t necessarily agree (I would use distinct keys for authentication and signing—the overhead is creating a second keypair for signing, which is still low), and will discuss this is some details in [the last section.](#actually-what-is-a-digital-signature)

??? info "Prerequisites"

    === "Windows"
        Git BASH (MinGW), Cygwin, or similar *nix-flavoured Shell implementation.

    === "*nix/BSD"
        By the time you install Git, everything else necessary is already installed.

??? example "Creating an SSH key"

    === "Rendered snippet"
        ![Generate SSH key](../images/ssh-keygen-light.png#only-light){ align=left width=61.8% title="TODO How to generate SSH key" }
        ![Generate SSH key](../images/ssh-keygen-dark.png#only-dark){ align=left width=61.8% title="TODO How to generate SSH key"}

        Current versions of OpenSSH support different algorithms for key generation (`dsa`, `ecdsa`, `ed25519`, `rsa` and `ecdsa-sk`, `ed25519-sk`).
        I have my reasons[^3], why I use `ed25519` throughout this tutorial, see the section [“what does it mean”](#actually-what-is-a-digital-signature) in case you are interested in more details.

        :skull: Please never use `dsa`[^4].

        The text in "quotation marks" is a freetext comment. I tend to use an identification (like e-mail address) and purpose (in this case "signing") for the key, occasionally with binding service. Full example would be: <ul><li>Authentication key: `"git@github.com 4 ada@lovelace.ac.uk"`</li><li>Signing key: `"sign@github.com 4 ada@lovelace.ac.uk"`</li></ul>

        You should have a (strong) passphrase for your SSH keys[^5].

    === "Copyable snippet"
        ```sh title="Key generation with OpenSSH"
        ssh-keygen -t ed25519 -C "ada@lovelace.ac.uk (signing)" #(1)
        # Possible input for the interactive generator:
        #     path for generated key pair
        #     passphrase for the key. (2)
        ```

        1. Current versions of OpenSSH support different algorithms for key generation (`dsa`, `ecdsa`, `ed25519`, `rsa` and `ecdsa-sk`, `ed25519-sk`).
        I have my reasons[^3], why I use `ed25519` throughout this tutorial, see the section [“what does it mean”](#actually-what-is-a-digital-signature) in case you are interested in more details.<br/>
        :skull: Please never use `dsa`[^4].<br/>
        The text in "quotation marks" is a freetext comment. I tend to use an identification (like e-mail address) and purpose (in this case "signing") for the key, occasionally with binding service. Full example would be: <ul><li>Authentication key: `"git@github.com 4 ada@lovelace.ac.uk"`</li><li>Signing key: `"sign@github.com 4 ada@lovelace.ac.uk"`</li></ul>
        2. You should have a (strong) passphrase for your SSH keys[^5].

???+ example "Configuring SSH key for Git signing"

    In Git, you can have configuration in three different scopes: `system` (scope of the Git installation, **not** your OS!), `global` (scope of the OS user), and `local` (scope of the Git project). SSH keys, whether for authentication, signing, or both, make sense in `global` or `local` (:warning: put this part of the configuration into `system` scope only if you really know what you are doing).
    
    The usual setup is to put it into `global` scope, and in case needed override the user-default settings in the `local` scope. This is for example useful if you are having multiple identities and you want to use a “default” key pair (configured in the `global` scope, e.g., your “company identity”), whilst some projects having a specific key (configured in their respective `local` scope, e.g., your “private GitHub persona”).

    :information: It is possible to have different _kinds_ of keys in different scopes (e.g., an SSH key in `global` can be overridden by a GPG or S/MIME key in `local` or vice versa).

    === "Rendered snippet"
        ![Git config for SSH](../images/ssh-git-config-light.png#only-light){ align=left width=61.8% title="Configure SSH key for signing git commits" }
        ![Git config for SSH](../images/ssh-git-config-dark.png#only-dark){ align=left width=61.8% title="Configure SSH key for signing git commits"}

        :warning: This setup will use the private key corresponding to the configured public key (at the path `user.signignkey`) for **every** git commit and/or tag automatically. See next section for details.

        :warning: This setup assumes that you have a file listing “trusted SSH keys” for signing, see below for details.


    === "Copyable snippet"
        ```toml title="Git configuration for signing with SSH key"
        # File behind `git config --global -e`
        [user]
                name = Augusta Ada King
                email = ada@lovelace.ac.uk
                signingkey = /home/ada/.ssh/git-signer-key.pub
        [commit] #(1)
                gpgsign = true
        [tag] #(2)
                gpgsign = true
        [gpg]
                program = gpg
                format = ssh
        [gpg.ssh] #(3)
                allowedSignersFile = /home/ada/.ssh/allowed-signers
        ```

        1. :warning: This setup will use the private key corresponding to the configured public key (at the path `user.signignkey`) for **every** git commit automatically. See next section for details.
        2. :warning: This setup will use the private key corresponding to the configured public key (at the path `user.signignkey`) for **every** git tag automatically. See next section for details.
        3. :warning: This setup assumes that you have a file listing “trusted SSH keys” for signing, see below for details.

???+ example "Signing git commits or tags with an SSH key"

    To sign your git commits or tags, you have to decide whether you want to “by default” sign everything you create, or selectively. In case you want to sign everything, you are already set up: the git settings `commit.gpgsign = true` and `tag.gpgsign = true` made in the previous step will sign _every_ commit and tag you create with the configured key (regardless of the type of the key). In case you want to sign selectively, you have to set both of them to `false` (or just do not define them, as the default value is `false`), and then add `-S/--gpg-sign` to each of your commit commands.

    === "Rendered snippet"
        ![Sign a git commit](../images/git-sign-commit-light.png#only-light){ align=left width=61.8% title="Sign a git tag" }
        ![Sign a git commit](../images/git-sign-commit-dark.png#only-dark){ align=left width=61.8% title="Sign a git tag"}


    === "Copyable snippet"
        ```sh title="Sign a git commit"
        ; git commit -S -m 'commit message'
        ```

    :warning: Do not confuse with `-s/--signoff`, which is an entirely different thing. See discussion in the [section about why.](#why-should-you-sign-your-commits-or-tags-at-all)

    Of course, git being git, signing your tags is done by `-s/--sign`. Just to (not) keep things consistent.

    === "Rendered snippet"
        ![Sign a git tag](../images/git-sign-tag-light.png#only-light){ align=left width=61.8% title="Sign a git tag" }
        ![Sign a git tag](../images/git-sign-tag-dark.png#only-dark){ align=left width=61.8% title="Sign a git tag"}


    === "Copyable snippet"
        ```sh title="Sign a git tag"
        ; git tag -s -m 'v1.2.3' v1.2.3
        ```

    :information: In case you are using GUI tools (GitK, Fork, GitKraken, IntelliJ IDEA, etc. pp.) and you want to sign your commits, you are probably better off by setting `commit.gpgsign = true` in your configuration. In this case the tools will use the signing transitively and you don’t have to find a way to “smuggle” flags to the git-commands issued by the tool.

??? example "Validating signatures created with an SSH key"

    Please see also the section [“what you get for it”](#what-is-the-added-value-of-signing-your-commits-or-tags) for a more GUI/server focused validation point of view.

    :information: Keep in mind, that in most of the cases you will not want to validate signatures locally, so this step is highly optional.

    So, you have a git repository, which contains commits and/or tags that have been signed with SSH keys. Now, you want to validate these signatures, how can you do that? Let’s start with commits, you can either go directly with a commit hash to `git verify-commit`, or you can show the verification of signatures in `git log`

    === "Rendered snippet"
        ![Verify an SSH-signed git commit](../images/git-verify-commit-ssh-light.png#only-light){ align=left width=61.8% title="Verify an SSH-signed git commit" }
        ![Verify an SSH-signed git commit](../images/git-verify-commit-ssh-dark.png#only-dark){ align=left width=61.8% title="Verify an SSH-signed git commit"}


    === "Copyable snippet"
        ```sh title="Verify an SSH-signed git commit"
        ; git verify-commit 18916f
        Good "git" signature for ada@lovelace.ac.uk with ED25519 key SHA256:LE891EF5V/sz5oo1CJfRMlq7+FiT5CI1+FcvF+pMeCY

        ; git log -n1 --show-signature
        commit 18916... (...)
        Good "git" signature for ada@lovelace.ac.uk with ED25519 key SHA256:LE891EF5V/sz5oo1CJfRMlq7+FiT5CI1+FcvF+pMeCY
        Author: Augusta Ada King <ada@lovelace.ac.uk>
        Date:   ...
        [rest of the message]
        ```

    For tags your only option is `git verify-tag` with the tag’s name.

    === "Rendered snippet"
        TODO


    === "Copyable snippet"
        ```sh title="Verify an SSH-signed git tag"
        ; git verify-tag v1.2.3
        Good "git" signature for ada@lovelace.ac.uk with ED25519 key SHA256:LE891EF5V/sz5oo1CJfRMlq7+FiT5CI1+FcvF+pMeCY
        ```

    :information: It is extremely unlikely that a tag or the content it points to can be modified without anybody noticing (as a tag always points to a specific commit hash), nevertheless SSH signatures of tags could be tampered with.

    In the unlikely case when the content of a signed tag has been modified after signing and without re-signing by the user (e.g., by the signature having been tampered with), you will see the corresponding message:

    ```sh
    Could not verify signature.
    Signature verification failed: incorrect signature
    ```

    In the more likely scenario that you have a setup problem with the `allowed_signers` file (e.g., wrong path in your git config, or you just like singers more than signers), you will see something akin the following message:

    ```sh
    Good "git" signature with ED25519 key SHA256:LE891EF5V/sz5oo1CJfRMlq7+FiT5CI1+FcvF+pMeCY
    Unable to open allowed keys file "/home/ada/.ssh/allowed-singers": No such file or directory
    sig_find_principals: sshsig_find_principal: No such file or directory
    No principal matched.
    ```

    In the usual scenario that you have a proper setup for your `allowed_signers` file but you don’t have the public SSH key of the committer in the file yet, you will see something like:

    ```sh
    Good "git" signature with ED25519 key SHA256:LE891EF5V/sz5oo1CJfRMlq7+FiT5CI1+FcvF+pMeCY
    No principal matched.
    ```

    How can you acquire the corresponding SSH keys? Either you can ask the committer to send their key to you, or on GitHub and GitLab you can look it up, in case they stored it there: `(github|gitlab).com/<username>.keys` will list all the SSH public keys the user uploaded to the server.

    :information: Please note that signatures of commits and tags are stored differently (also based on what kind of signature they are). At this point it’s only necessary to mention, that unless you are looking for them you cannot easily see “raw” signatures.

### Signing stuff with GPG

??? info "Prerequisites"

    === "Windows"
        * Git BASH (MinGW), Cygwin, or similar *nix-flavoured Shell implementation.
        * Optionally GnuPG and Gpg4win in case you want to do use smart-cards.

    === "*nix/BSD"
        By the time you install Git, everything else necessary is already installed.

??? example "Creating a GPG keypair"

    Sadly, describing this step would really stretch the scope of this blog post. There are just too many possibilities involved, especially considering different operating systems and software/hardware keys. Thus, I will just link some tutorials I myself have found useful:

    * [The GNU Privacy Handbook](https://www.gnupg.org/gph/en/manual/c14.html)
    * [A Practical Guide to GPG Part 1](https://www.linuxbabe.com/security/a-practical-guide-to-gpg-part-1-generate-your-keypair)
    * [Getting started with GPG](https://www.redhat.com/sysadmin/getting-started-gpg)
    * [How to create GPG keypairs](https://www.redhat.com/sysadmin/creating-gpg-keypairs)
    * [YubiKey-Guide by drduh](https://github.com/drduh/YubiKey-Guide)

    And some others that are somewhat overlapping with this blogpost:

    * [Settung up GPG on Windows](https://www.git-tower.com/blog/setting-up-gpg-windows)
    * [Generating a new GPG key](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key)

???+ example "Configuring GPG key for Git signing"

    In Git, you can have configuration at three different scope: `system` (scope of the Git installation), `global` (scope of the OS user), and `local` (scope of the Git project). GPG keys for signing make sense in `global` or `local` (:warning: put this part of the configuration into `system` scope only if you really know what you are doing).
    
    The usual setup is to put it into `global` scope, and in case needed override the user-default settings in the `local` scope. This is for example useful if you are having multiple identities and you want to use a “default” key pair (configured in the `global` scope, e.g., your “company identity”), whilst some projects having a specific key (configured in their respective `local` scope, e.g., your “private GitHub persona”).

    :information: It is possible to have different _kinds_ of keys in different scopes (e.g., an SSH key in `global` can be overridden by a GPG or S/MIME key in `local` or vice versa).

    === "Rendered snippet"
        TODO

        :warning: This setup will use the private key corresponding to the configured public key (at the path `user.signignkey`) for **every** git commit and/or tag automatically. See next section for details.


    === "Copyable snippet"
        ```toml title="Git configuration for signing with GPG key"
        # File behind `git config --global -e`
        [user]
                name = Augusta Ada King
                email = ada@lovelace.ac.uk
                signingkey = 02F3................................A208 #(1)
        [commit] #(2)
                gpgsign = true
        [tag] #(3)
                gpgsign = true
        [gpg]
                program = gpg
        ```

        1. :information: You have to put in the full fingerprint of your GPG key pair (20 bytes, i.e., 10 × 4 hex characters), the key ID is not enough.
        2. :warning: This setup will use the private key corresponding to the configured public key (at the path `user.signignkey`) for **every** git commit automatically. See next section for details.
        3. :warning: This setup will use the private key corresponding to the configured public key (at the path `user.signignkey`) for **every** git tag automatically. See next section for details.

???+ example "Signing git commits or tags with a GPG key"

    To sign your git commits or tags, you have to decide whether you want to “by default” sign everything you create, or selectively. In case you want to sign everything, you are already set up: the git settings `commit.gpgsign = true` and `tag.gpgsign = true` made in the previous step will sign _every_ commit and tag you create with the configured key (regardless of the type of the key). In case you want to sign selectively, you have to set both of them to `false` (or just do not define them, as the default value is `false`), and then add `-S/--gpg-sign` to each of your commit commands.

    === "Rendered snippet"
        ![Sign a git commit](../images/git-sign-commit-light.png#only-light){ align=left width=61.8% title="Sign a git tag" }
        ![Sign a git commit](../images/git-sign-commit-dark.png#only-dark){ align=left width=61.8% title="Sign a git tag"}


    === "Copyable snippet"
        ```sh title="Sign a git commit"
        ; git commit -S -m 'commit message'
        ```

    :warning: Do not confuse with `-s/--signoff`, which is an entirely different thing. See discussion in the [section about why.](#why-should-you-sign-your-commits-or-tags-at-all)

    Of course, git being git, signing your tags is done by `-s/--sign`. Just to (not) keep things consistent.

    === "Rendered snippet"
        ![Sign a git tag](../images/git-sign-tag-light.png#only-light){ align=left width=61.8% title="Sign a git tag" }
        ![Sign a git tag](../images/git-sign-tag-dark.png#only-dark){ align=left width=61.8% title="Sign a git tag"}


    === "Copyable snippet"
        ```sh title="Sign a git tag"
        ; git tag -s -m 'v1.2.3' v1.2.3
        ```

    :information: In case you are using GUI tools (GitK, Fork, GitKraken, IntelliJ IDEA, etc. pp.) and you want to sign your commits, you are probably better off by setting `commit.gpgsign = true` in your configuration. In this case the tools will use the signing transitively and you don’t have to find a way to “smuggle” flags to the git-commands issued by the tool.

??? example "Validating signatures created with a GPG key"

    Please see also the section [“what you get for it”](#what-is-the-added-value-of-signing-your-commits-or-tags) for a more GUI/server focused validation point of view.

    :information: Keep in mind, that in most of the cases you will not want to validate signatures locally, so this step is highly optional.

    So, you have a git repository, which contains commits and/or tags that have been signed with GPG keys. Now, you want to validate these signatures, how can you do that? Let’s start with commits, you can either go directly with a commit hash to `git verify-commit`, or you can show the verification of signatures in `git log`

    :information: Pre-note: the “[full]” in the output is the GPG trust level. Meaning of which is blatantly out of scope of this blog post, but according to the author of GnuPG: “You would need to look at the source [code]”[^7].

    === "Rendered snippet"
        TODO

    === "Copyable snippet"
        ```sh title="Verify a GPG-signed git commit"
        ; git verify-commit a27293
        gpg: Signature made 28/01/24 13:06:18 W. Europe Standard Time
        gpg:                using EDDSA key 02F3................................A208
        gpg: Good signature from "Augusta Ada King <ada@lovelace.ac.uk>" [full]

        ; git log -n1 --show-signature
        commit a27293... (...)
        gpg: Signature made 28/01/24 13:06:18 W. Europe Standard Time
        gpg:                using EDDSA key 02F3................................A208
        gpg: Good signature from "Augusta Ada King <ada@lovelace.ac.uk>" [full]
        Author: Augusta Ada King <ada@lovelace.ac.uk>
        Date:   ...
        [rest of the message]
        ```

    :warning: Be advised that in case you are using Gpg4win (because e.g., you are using a Yubikey to store your GPG private key), there is a *rendering* bug in the output when showing signatures and an extra `^M` is rendered—regardless which console are you using, let it be CMD, PowerShell, Cygwin, or other[^6]. This is only in the output, nothing is “corrupted” as such.

    For tags your only option is `git verify-tag` with the tag’s name.

    === "Rendered snippet"
        TODO


    === "Copyable snippet"
        ```sh title="Verify a GPG-signed git tag"
        ; git verify-tag v1.2.3
        gpg: Signature made 28/01/24 13:06:18 W. Europe Standard Time
        gpg:                using EDDSA key 02F3................................A208
        gpg: Good signature from "Augusta Ada King <ada@lovelace.ac.uk>" [full]
        ```

    :information: It is extremely unlikely that a tag or the content it points to can be modified without anybody noticing (as a tag always points to a specific commit hash).

    In the unlikely case when the content of a signed commit has been modified after signing and without re-signing by the user (or in the even more unlikely case of the signature having been tampered with), you will see the corresponding message:

    ```sh
    gpg: Signature made 28/01/24 13:06:18 W. Europe Standard Time
    gpg:                using EDDSA key 02F3................................A208
    gpg: BAD signature from "Augusta Ada King <ada@lovelace.ac.uk>" [full]
    ```

    In the usual scenario that you do not have the public key on your key-ring, you will see something akin the following message:

    ```sh
    gpg: Signature made 28/01/24 13:06:18 W. Europe Standard Time
    gpg:                using EDDSA key 02F3................................A208
    gpg: Can't check signature: No public key
    ```

    How can you acquire the corresponding GPG public keys? Either you can ask the committer to send their key to you, or on GitHub and GitLab you can look it up, in case they stored it there: `(github|gitlab).com/<username>.gpg` will list all the GPG public keys the user uploaded to the server.

    :information: Please note that signatures of commits and tags are stored differently (also based on what kind of signature they are). At this point it’s only necessary to mention, that unless you are looking for them you cannot easily see “raw” signatures.

### Signing stuff with S/MIME

TODO

## What is the added value of signing your commits (or tags)

TODO: No porcelain command for looking at signatures of commits (but plumbing: git cat-file -p 18916f2...), whilst tags have it in their details in case of SSH signatures (git show <tag>)

C:\Projects\git\bak\tmp>git cat-file -p 18916f2658d6dcd31b178eeeb8de186e06381f10
tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904
author Augusta Ada King <ada@lovelace.ac.uk> 1706456417 +0100
committer Augusta Ada King <ada@lovelace.ac.uk> 1706456417 +0100
gpgsig -----BEGIN SSH SIGNATURE-----
 U1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAgNOw9gxlAHd45igCIRE7TypQ8Qh
 fRUTLCtNdJ8hbdbjAAAAADZ2l0AAAAAAAAAAZzaGE1MTIAAABTAAAAC3NzaC1lZDI1NTE5
 AAAAQFP1wEjmJ5+PI4kCaRfpo/u7Ap6+W+wDau4EHvtgzEEVR71f+PS1XmC8tFqN0RXqsK
 wb1xyg0Vy+xdvsoYkdcwk=
 -----END SSH SIGNATURE-----

commit


C:\Projects\git\bak\tmp>git show v1.2.3
tag v1.2.3
Tagger: Augusta Ada King <ada@lovelace.ac.uk>
Date:   Sun Jan 28 17:15:14 2024 +0100

v1.2.3
-----BEGIN SSH SIGNATURE-----
U1NIU0lHAAAAAQAAADMAAAALc3NoLWVkMjU1MTkAAAAgNOw9gxlAHd45igCIRE7TypQ8Qh
fRUTLCtNdJ8hbdbjAAAAADZ2l0AAAAAAAAAAZzaGE1MTIAAABTAAAAC3NzaC1lZDI1NTE5
AAAAQKD0hvxzDOTV/OJiVg8XD+9lpoI8dDD5+edu/RuRG2iTP/C1zgMImOYn/tS6xHZZe3
981rJkekeKE9ludV/ghgs=
-----END SSH SIGNATURE-----

commit 18916f2658d6dcd31b178eeeb8de186e06381f10 (HEAD -> master, tag: v9.9.9, tag: v9.9.8, tag: v6.6.6, tag: v3.2.1, tag: v1.2.3)
Author: Augusta Ada King <ada@lovelace.ac.uk>
Date:   Sun Jan 28 16:40:17 2024 +0100

    commit


## Why should you sign your commits (or tags) at all

TODO: `-S` vs. `-s`

## What if you want to up your game and use agents or smart cards?

TODO

## Actually, what is a digital signature?

TODO: Should you reuse the same SSH keys? ^1 says it's OK, but meh

[^1]: [“It’s Now Possible To Sign Arbitrary Data With Your SSH Keys”](https://www.agwa.name/blog/post/ssh_signatures?s=09)
[^2]: [Accepted answer for the StackOverflow question “Why does git sign with GPG keys rather than using SSH keys?”](https://stackoverflow.com/a/45120525/5471574)
[^3]: [Question on Security StackExchange “ECDSA vs ECDH vs Ed25519 vs Curve25519”](https://security.stackexchange.com/q/50878/135976)
[^4]: [Arch Linux Wiki, Article “SSH keys”](https://wiki.archlinux.org/title/SSH_keys#Choosing_the_authentication_key_type)
[^5]: [Accepted answer for the Security StackExchange question “ssh-keygen: What is the passphrase for?”](https://security.stackexchange.com/a/183637/135976)
[^6]: [git-for-windows Github Issue#1249](https://github.com/git-for-windows/git/issues/1249)
[^7]: [Accepted answer for the Security StackExchange question “What is the exact meaning of this gpg output regarding trust?”](https://security.stackexchange.com/a/41209/135976)
